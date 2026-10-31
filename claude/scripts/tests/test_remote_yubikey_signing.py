import base64
import importlib.machinery
import importlib.util
import io
import json
import os
import subprocess
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock


SCRIPTS = Path(__file__).resolve().parent.parent


def load_script(name):
    loader = importlib.machinery.SourceFileLoader(name.replace("-", "_"), str(SCRIPTS / name))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


client = load_script("remote-yubikey-sign")
server = load_script("yubikey-sign-server")


def response(signature=b"signature"):
    return json.dumps({"signature": base64.b64encode(signature).decode()}).encode()


def request(payload=b"payload", context=None, **extra):
    document = {
        "version": 1,
        "payload": base64.b64encode(payload).decode(),
        "context": context
        or {"origin": "studio", "path": "/repo", "repo": "repo", "branch": "main"},
    }
    document.update(extra)
    return json.dumps(document).encode()


class ClientArgumentTests(unittest.TestCase):
    def test_accepts_file_and_arbitrary_flag_order(self):
        self.assertEqual(
            client.parse_sign_args(["file", "-n", "git", "-f", client.EXPECTED_KEY, "-Y", "sign"]),
            "file",
        )

    def test_accepts_stdin_mode(self):
        self.assertIsNone(
            client.parse_sign_args(["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git"])
        )

    def test_rejects_namespace_key_flags_and_multiple_files(self):
        invalid = [
            ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "file"],
            ["-Y", "sign", "-f", "/tmp/other.pub", "-n", "git"],
            ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git", "-q"],
            ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git", "a", "b"],
            ["-Y", "sign", "-f", client.EXPECTED_KEY, "-f", client.EXPECTED_KEY, "-n", "git"],
        ]
        for args in invalid:
            with self.subTest(args=args), self.assertRaises(client.SigningError):
                client.parse_sign_args(args)

    def test_non_sign_operation_passes_through(self):
        with mock.patch.object(client.os, "execv", side_effect=RuntimeError("exec")) as execute:
            with mock.patch.object(client.sys, "argv", ["remote-yubikey-sign", "-Y", "verify"]):
                with self.assertRaisesRegex(RuntimeError, "exec"):
                    client.main()
        execute.assert_called_once_with(client.SSH_KEYGEN, [client.SSH_KEYGEN, "-Y", "verify"])


class ClientScopeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.scope = Path(self.temporary.name, "babylonlabs-io")
        self.scope.mkdir()

    def context_for(self, common_dir, top_level=None):
        top_level = top_level or Path(self.temporary.name, "worktree")
        outputs = [str(common_dir), str(top_level), "main"]
        with mock.patch.object(client, "SCOPE_ROOT", str(self.scope)):
            with mock.patch.object(client, "git_output", side_effect=outputs):
                return client.repository_context()

    def test_allows_repository_common_dir(self):
        common_dir = self.scope / "repo" / ".git"
        common_dir.mkdir(parents=True)
        with mock.patch.object(client.socket, "gethostname", return_value="studio"):
            context = self.context_for(common_dir)
        self.assertEqual(context["branch"], "main")
        self.assertEqual(context["origin"], "Mac Studio (reported): studio")

    def test_allows_linked_worktree_by_common_dir(self):
        common_dir = self.scope / "repo" / ".git"
        common_dir.mkdir(parents=True)
        outside_worktree = Path(self.temporary.name, "linked-worktree")
        outside_worktree.mkdir()
        self.assertEqual(
            self.context_for(common_dir, outside_worktree)["path"],
            os.path.realpath(outside_worktree),
        )

    def test_rejects_outside_and_prefix_sibling(self):
        for common_dir in [
            Path(self.temporary.name, "outside", ".git"),
            Path(f"{self.scope}-evil", "repo", ".git"),
        ]:
            common_dir.mkdir(parents=True)
            with self.subTest(common_dir=common_dir), self.assertRaises(client.SigningError):
                self.context_for(common_dir)

    def test_rejects_symlink_escape(self):
        outside = Path(self.temporary.name, "outside")
        outside.mkdir()
        link = self.scope / "repo"
        link.symlink_to(outside, target_is_directory=True)
        with self.assertRaises(client.SigningError):
            self.context_for(link / ".git")

    def test_client_sanitizes_display_context(self):
        self.assertEqual(client.sanitize_context("bad'\"\\\nname", 100), "badname")
        self.assertEqual(client.sanitize_context("abcdef", 3), "abc")


class ClientSigningTests(unittest.TestCase):
    def test_file_mode_writes_only_verified_signature(self):
        with tempfile.TemporaryDirectory() as directory:
            payload_file = Path(directory, "payload")
            payload_file.write_bytes(b"commit")
            args = ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git", str(payload_file)]
            with mock.patch.object(client, "repository_context", return_value={}):
                with mock.patch.object(client, "run_remote", return_value=response(b"verified")):
                    with mock.patch.object(client, "verify_signature") as verify:
                        client.sign(args)
            verify.assert_called_once_with(b"commit", b"verified")
            self.assertEqual(Path(f"{payload_file}.sig").read_bytes(), b"verified")

    def test_stdin_mode_keeps_stdout_signature_only(self):
        stdin = types.SimpleNamespace(buffer=io.BytesIO(b"commit"))
        output = io.BytesIO()
        stdout = types.SimpleNamespace(buffer=output)
        args = ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git"]
        with mock.patch.object(client, "repository_context", return_value={}):
            with mock.patch.object(client, "run_remote", return_value=response(b"verified")):
                with mock.patch.object(client, "verify_signature"):
                    with mock.patch.object(client.sys, "stdin", stdin):
                        with mock.patch.object(client.sys, "stdout", stdout):
                            client.sign(args)
        self.assertEqual(output.getvalue(), b"verified")

    def test_payload_limit_blocks_remote_call(self):
        stdin = types.SimpleNamespace(buffer=io.BytesIO(b"x" * (client.MAX_PAYLOAD + 1)))
        args = ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git"]
        with mock.patch.object(client, "repository_context", return_value={}):
            with mock.patch.object(client, "run_remote") as remote:
                with mock.patch.object(client.sys, "stdin", stdin):
                    with self.assertRaises(client.SigningError):
                        client.sign(args)
        remote.assert_not_called()

    def test_verification_failure_creates_no_signature(self):
        with tempfile.TemporaryDirectory() as directory:
            payload_file = Path(directory, "payload")
            payload_file.write_bytes(b"commit")
            args = ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git", str(payload_file)]
            with mock.patch.object(client, "repository_context", return_value={}):
                with mock.patch.object(client, "run_remote", return_value=response(b"wrong")):
                    with mock.patch.object(
                        client, "verify_signature", side_effect=client.SigningError("mismatch")
                    ):
                        with self.assertRaises(client.SigningError):
                            client.sign(args)
            self.assertFalse(Path(f"{payload_file}.sig").exists())

    def test_existing_signature_is_unchanged_without_remote_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            payload_file = Path(directory, "payload")
            payload_file.write_bytes(b"commit")
            signature_file = Path(f"{payload_file}.sig")
            signature_file.write_bytes(b"existing")
            args = ["-Y", "sign", "-f", client.EXPECTED_KEY, "-n", "git", str(payload_file)]
            with mock.patch.object(client, "repository_context", return_value={}):
                with mock.patch.object(
                    client, "run_remote", return_value=response(b"new")
                ) as remote:
                    with mock.patch.object(client, "verify_signature"):
                        with self.assertRaisesRegex(client.SigningError, "already exists"):
                            client.sign(args)
            self.assertEqual(signature_file.read_bytes(), b"existing")
            self.assertEqual(remote.call_count, 1)

    def test_local_verification_uses_expected_key_payload_and_namespace(self):
        with tempfile.TemporaryDirectory() as directory:
            key = Path(directory, "key.pub")
            key.write_text("sk-ssh-ed25519@openssh.com AAAA comment\n")
            tool = Path(directory, "ssh-keygen")
            tool.write_text(
                "#!/bin/sh\n"
                "case \"$*\" in *'-I remote-yubikey-sign -n git -s'*) ;; *) exit 2;; esac\n"
                "test \"$(cat)\" = commit || exit 3\n"
            )
            tool.chmod(0o755)
            with mock.patch.object(client, "EXPECTED_KEY", str(key)):
                with mock.patch.object(client, "SSH_KEYGEN", str(tool)):
                    client.verify_signature(b"commit", b"signature")

    def test_mismatched_signature_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            key = Path(directory, "key.pub")
            key.write_text("sk-ssh-ed25519@openssh.com AAAA\n")
            tool = Path(directory, "ssh-keygen")
            tool.write_text("#!/bin/sh\ncat >/dev/null\nexit 1\n")
            tool.chmod(0o755)
            with mock.patch.object(client, "EXPECTED_KEY", str(key)):
                with mock.patch.object(client, "SSH_KEYGEN", str(tool)):
                    with self.assertRaises(client.SigningError):
                        client.verify_signature(b"commit", b"wrong")

    def test_remote_command_is_fixed(self):
        process = mock.Mock(returncode=0)
        process.communicate.return_value = (response(), b"")
        with mock.patch.object(client.subprocess, "Popen", return_value=process) as popen:
            client.run_remote(b"request")
        self.assertEqual(popen.call_args.args[0], [client.SSH, client.SSH_ALIAS, client.REMOTE_COMMAND])
        self.assertTrue(popen.call_args.kwargs["start_new_session"])

    def test_cancellation_is_not_retried(self):
        process = mock.Mock(returncode=client.EXIT_CANCELLED)
        process.communicate.return_value = (b"", b"")
        with mock.patch.object(client.subprocess, "Popen", return_value=process) as popen:
            with self.assertRaisesRegex(client.SigningError, "YUBIKEY_SIGNING_CANCELLED"):
                client.run_remote(b"request")
        self.assertEqual(popen.call_count, 1)

    def test_remote_timeout_cleans_process_group(self):
        process = mock.Mock()
        process.communicate.side_effect = subprocess.TimeoutExpired("ssh", 1)
        with mock.patch.object(client.subprocess, "Popen", return_value=process):
            with mock.patch.object(client, "terminate_process_group") as terminate:
                with self.assertRaisesRegex(client.SigningError, "timed out"):
                    client.run_remote(b"request")
        terminate.assert_called_once_with(process)


class ServerRequestTests(unittest.TestCase):
    def test_valid_request(self):
        payload, context = server.parse_request(request())
        self.assertEqual(payload, b"payload")
        self.assertEqual(context["repo"], "repo")

    def test_rejects_schema_base64_and_size_misuse(self):
        cases = [
            b"{}",
            request(extra=True),
            request().replace(b'"version": 1', b'"version": true'),
            json.dumps(
                {
                    "version": 1,
                    "payload": "***",
                    "context": {"origin": "a", "path": "b", "repo": "c", "branch": "d"},
                }
            ).encode(),
            request(b"x" * (server.MAX_PAYLOAD + 1)),
        ]
        for body in cases:
            with self.subTest(body=body[:40]), self.assertRaises(server.RequestError):
                server.parse_request(body)

    def test_rejects_unsafe_or_oversized_context(self):
        for field, value in [("branch", "bad'branch"), ("path", "x" * 1025), ("repo", "bad\nrepo")]:
            context = {"origin": "studio", "path": "/repo", "repo": "repo", "branch": "main"}
            context[field] = value
            with self.subTest(field=field), self.assertRaises(server.RequestError):
                server.parse_request(request(context=context))

    def test_requires_exact_original_command(self):
        with mock.patch.dict(server.os.environ, {"SSH_ORIGINAL_COMMAND": "babylon-git-sign-v1 extra"}):
            with mock.patch.object(server, "read_request") as read:
                self.assertEqual(server.main(), 1)
        read.assert_not_called()


class ServerSigningTests(unittest.TestCase):
    def context(self):
        return {"origin": "studio", "path": "/repo", "repo": "repo", "branch": "main"}

    def signing_process(self, returncode=0, stderr=b"", signature=b"signature"):
        process = mock.Mock(returncode=returncode)

        def communicate(**_kwargs):
            if signature is not None:
                payload_path = Path(process.command[-1])
                Path(f"{payload_path}.sig").write_bytes(signature)
            return None, stderr

        process.communicate.side_effect = communicate
        return process

    def test_uses_fixed_gate_key_namespace_and_sanitized_environment(self):
        process = self.signing_process()

        def create(command, **kwargs):
            process.command = command
            process.kwargs = kwargs
            return process

        with mock.patch.object(server.subprocess, "Popen", side_effect=create):
            self.assertEqual(server.sign_payload(b"payload", self.context()), b"signature")
        self.assertEqual(process.command[0], server.SIGNING_GATE)
        self.assertEqual(process.command[1:7], ["-Y", "sign", "-f", server.EXPECTED_KEY, "-n", "git"])
        self.assertEqual(process.kwargs["env"]["SSH_ASKPASS_ORIGIN_REPO"], "repo")
        self.assertNotIn("SSH_ORIGINAL_COMMAND", process.kwargs["env"])
        self.assertTrue(process.kwargs["start_new_session"])

    def test_cancellation_and_gate_error_do_not_retry(self):
        for returncode, stderr, message in [
            (server.EXIT_CANCELLED, b"", "YUBIKEY_SIGNING_CANCELLED"),
            (1, b"hardware failed", "hardware failed"),
        ]:
            process = self.signing_process(returncode, stderr, signature=None)
            with self.subTest(returncode=returncode):
                with mock.patch.object(server.subprocess, "Popen", return_value=process) as popen:
                    with self.assertRaisesRegex(server.RequestError, message):
                        server.sign_payload(b"payload", self.context())
                self.assertEqual(popen.call_count, 1)

    def test_missing_signature_is_rejected(self):
        process = self.signing_process(signature=None)
        with mock.patch.object(server.subprocess, "Popen", return_value=process):
            with self.assertRaisesRegex(server.RequestError, "did not produce"):
                server.sign_payload(b"payload", self.context())

    def test_sign_timeout_cleans_process_group(self):
        process = mock.Mock()
        process.communicate.side_effect = subprocess.TimeoutExpired("gate", 1)
        with mock.patch.object(server.subprocess, "Popen", return_value=process):
            with mock.patch.object(server, "terminate_process_group") as terminate:
                with self.assertRaisesRegex(server.RequestError, "timed out"):
                    server.sign_payload(b"payload", self.context())
        terminate.assert_called_once_with(process)


if __name__ == "__main__":
    unittest.main()
