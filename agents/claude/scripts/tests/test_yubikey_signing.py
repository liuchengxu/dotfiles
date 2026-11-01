"""Exercise signing consent with fake hardware, Keychain, and dialogs."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1]


class SigningTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.env = dict(os.environ, XDG_STATE_HOME=str(self.root / "state"))
        self.env["SIGN_TEST_LOG"] = str(self.root / "calls")
        self.keychain = self.script("security", 'printf "TEST_PIN\\n"\n')
        self.dialog = self.script("dialog", '''
case "$SIGN_TEST_MODE" in
  cancel) echo 'User canceled. (-128)' >&2; exit 1 ;;
  error) echo 'Dialog failed. (-600)' >&2; exit 1 ;;
esac
exit 0
''')
        askpass = (SCRIPTS / "ssh-askpass").read_text()
        askpass = askpass.replace("/usr/bin/osascript", str(self.dialog))
        askpass = askpass.replace("security find-generic-password", f"{self.keychain} find-generic-password")
        self.askpass = self.script("askpass", askpass)
        self.keygen = self.script("keygen", '''
if [ "$1" = "-lf" ]; then
  case "$2" in
    software-key) echo '256 SHA256:test test (ED25519)' ;;
    ecdsa-hardware-key) echo '256 SHA256:test test (ECDSA-SK)' ;;
    unknown-key) exit 1 ;;
    multiple-keys) printf '256 SHA256:test test (ED25519-SK)\\n256 SHA256:test test (ED25519)\\n' ;;
    *) echo '256 SHA256:test test (ED25519-SK)' ;;
  esac
  exit 0
fi
if [ "$1" != "-Y" ] || [ "$2" != "sign" ]; then
  echo passthrough; exit 0
fi
if [ "$4" = "software-key" ]; then
  [ "$SSH_AUTH_SOCK" = test-agent ] || exit 5
  [ "$SSH_ASKPASS" = original-askpass ] || exit 6
  [ "$SSH_ASKPASS_REQUIRE" = prefer ] || exit 7
  echo agent-signing
  exit 0
fi
[ -z "$SSH_AUTH_SOCK" ] || exit 8
echo start >> "$SIGN_TEST_LOG"
pin=$("$SSH_ASKPASS" 'Enter PIN')
rc=$?
if [ "$rc" -ne 0 ]; then exit "$rc"; fi
[ "$pin" = TEST_PIN ] || exit 4
sleep 0.1
echo end >> "$SIGN_TEST_LOG"
exit 0
''')
        wrapper = (SCRIPTS / "yubikey-sign").read_text()
        wrapper = wrapper.replace("/opt/homebrew/opt/openssh/bin/ssh-keygen", str(self.keygen))
        wrapper = wrapper.replace('$HOME/.local/bin/ssh-askpass', str(self.askpass))
        self.wrapper = self.script("sign", wrapper)

    def script(self, name, text):
        path = self.root / name
        path.write_text("#!/bin/bash\n" + text)
        path.chmod(0o700)
        return path

    def sign(self, mode, key="test-key"):
        return subprocess.run(
            [str(self.wrapper), "-Y", "sign", "-f", key, "-n", "git", "test-buffer"],
            env=dict(self.env, SIGN_TEST_MODE=mode), capture_output=True, text=True, timeout=10,
        )

    def test_cancel_fails_current_attempt_but_not_next_request(self):
        cancelled = self.sign("cancel")
        self.assertEqual(cancelled.returncode, 97)
        self.assertIn("YUBIKEY_SIGNING_CANCELLED", cancelled.stderr)
        self.assertFalse((self.root / "state/yubikey-signing/lock.d").exists())
        self.assertEqual(self.sign("approve").returncode, 0)

    def test_old_decline_marker_does_not_block_signing(self):
        marker = self.root / "state/yubikey-signing/declined"
        marker.parent.mkdir(parents=True)
        marker.write_text("old cancellation")
        self.assertEqual(self.sign("approve").returncode, 0)
        self.assertEqual(marker.read_text(), "old cancellation")

    def test_dialog_error_fails_without_becoming_cancellation(self):
        failed = self.sign("error")
        self.assertNotEqual(failed.returncode, 0)
        self.assertNotIn("YUBIKEY_SIGNING_CANCELLED", failed.stderr)
        self.assertEqual(self.sign("approve").returncode, 0)

    def test_parallel_requests_keep_dialog_serialization(self):
        args = [str(self.wrapper), "-Y", "sign"]
        first = subprocess.Popen(args, env=dict(self.env, SIGN_TEST_MODE="approve"))
        second = subprocess.Popen(args, env=dict(self.env, SIGN_TEST_MODE="approve"))
        self.assertEqual(first.wait(timeout=10), 0)
        self.assertEqual(second.wait(timeout=10), 0)
        self.assertEqual((self.root / "calls").read_text().splitlines(), ["start", "end", "start", "end"])

    def test_non_signing_operations_pass_through(self):
        result = subprocess.run([str(self.wrapper), "-l"], env=self.env, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "passthrough")

    def test_software_key_preserves_agent_and_askpass(self):
        self.env.update(SSH_AUTH_SOCK="test-agent", SSH_ASKPASS="original-askpass",
                        SSH_ASKPASS_REQUIRE="prefer")
        result = self.sign("cancel", "software-key")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "agent-signing")
        self.assertFalse((self.root / "state/yubikey-signing").exists())

    def test_hardware_keys_clear_agent_and_keep_cancellation(self):
        self.env["SSH_AUTH_SOCK"] = "test-agent"
        for key in ["test-key", "ecdsa-hardware-key"]:
            with self.subTest(key=key):
                result = self.sign("cancel", key)
                self.assertEqual(result.returncode, 97, result.stderr)
                self.assertIn("YUBIKEY_SIGNING_CANCELLED", result.stderr)

    def test_unknown_and_multiple_keys_keep_approval_gate(self):
        self.env["SSH_AUTH_SOCK"] = "test-agent"
        for key in ["unknown-key", "multiple-keys"]:
            with self.subTest(key=key):
                result = self.sign("cancel", key)
                self.assertEqual(result.returncode, 97, result.stderr)
                self.assertIn("YUBIKEY_SIGNING_CANCELLED", result.stderr)


if __name__ == "__main__":
    unittest.main()
