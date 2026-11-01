#!/usr/bin/env swift

import Foundation
import Security
import Darwin

private let servicePrefix = "com.liuchengxu.yubikey-pin-helper.selftest."
private let account = "selftest"
private let initialValue = Data("yubikey-pin-helper-dummy-initial-v1".utf8)
private let updatedValue = Data("yubikey-pin-helper-dummy-updated-v1".utf8)

private enum ExpectedValue: String {
    case initial
    case updated
    case absent
}

private enum HelperError: Error, CustomStringConvertible {
    case usage
    case invalidUUID
    case invalidExpectedValue
    case keychain(operation: String, status: OSStatus)
    case unexpectedValue
    case unexpectedPresence

    var description: String {
        switch self {
        case .usage:
            return "usage: yubikey-pin.swift <create|check|update|delete> <UUID> [initial|updated|absent]"
        case .invalidUUID:
            return "error: UUID must use the canonical 8-4-4-4-12 format"
        case .invalidExpectedValue:
            return "error: check requires initial, updated, or absent"
        case let .keychain(operation, status):
            return "error: \(operation) failed with Keychain status \(status)"
        case .unexpectedValue:
            return "error: the self-test value did not match"
        case .unexpectedPresence:
            return "error: the self-test item exists"
        }
    }
}

private func normalizedUUID(_ argument: String) throws -> String {
    guard argument.range(
        of: #"^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$"#,
        options: .regularExpression
    ) != nil, let uuid = UUID(uuidString: argument) else {
        throw HelperError.invalidUUID
    }

    return uuid.uuidString.lowercased()
}

private func itemQuery(service: String) -> [CFString: Any] {
    [
        kSecClass: kSecClassGenericPassword,
        kSecAttrService: service,
        kSecAttrAccount: account,
        kSecAttrSynchronizable: false,
        kSecUseDataProtectionKeychain: true,
    ]
}

private func create(service: String) throws {
    var attributes = itemQuery(service: service)
    attributes[kSecAttrAccessible] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    attributes[kSecValueData] = initialValue

    let status = SecItemAdd(attributes as CFDictionary, nil)
    guard status == errSecSuccess else {
        throw HelperError.keychain(operation: "create", status: status)
    }
}

private func check(service: String, expected: ExpectedValue) throws {
    var query = itemQuery(service: service)
    query[kSecMatchLimit] = kSecMatchLimitOne

    if expected == .absent {
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        guard status == errSecItemNotFound else {
            if status == errSecSuccess {
                throw HelperError.unexpectedPresence
            }
            throw HelperError.keychain(operation: "check absent", status: status)
        }
        return
    }

    query[kSecReturnData] = true
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess else {
        throw HelperError.keychain(operation: "check", status: status)
    }
    guard let actual = result as? Data else {
        throw HelperError.unexpectedValue
    }

    let expectedData = expected == .initial ? initialValue : updatedValue
    guard actual == expectedData else {
        throw HelperError.unexpectedValue
    }
}

private func update(service: String) throws {
    let changes: [CFString: Any] = [kSecValueData: updatedValue]
    let status = SecItemUpdate(itemQuery(service: service) as CFDictionary, changes as CFDictionary)
    guard status == errSecSuccess else {
        throw HelperError.keychain(operation: "update", status: status)
    }
}

private func delete(service: String) throws {
    let status = SecItemDelete(itemQuery(service: service) as CFDictionary)
    guard status == errSecSuccess else {
        throw HelperError.keychain(operation: "delete", status: status)
    }
}

private func run(arguments: [String]) throws {
    guard arguments.count >= 3 else {
        throw HelperError.usage
    }

    let command = arguments[1]
    let service = servicePrefix + (try normalizedUUID(arguments[2]))

    switch command {
    case "create":
        guard arguments.count == 3 else {
            throw HelperError.usage
        }
        try create(service: service)
    case "check":
        guard arguments.count == 4 else {
            throw HelperError.usage
        }
        guard let expected = ExpectedValue(rawValue: arguments[3]) else {
            throw HelperError.invalidExpectedValue
        }
        try check(service: service, expected: expected)
    case "update":
        guard arguments.count == 3 else {
            throw HelperError.usage
        }
        try update(service: service)
    case "delete":
        guard arguments.count == 3 else {
            throw HelperError.usage
        }
        try delete(service: service)
    default:
        throw HelperError.usage
    }

    print("PASS")
}

do {
    try run(arguments: CommandLine.arguments)
} catch {
    FileHandle.standardError.write(Data("\(error)\n".utf8))
    exit(EXIT_FAILURE)
}
