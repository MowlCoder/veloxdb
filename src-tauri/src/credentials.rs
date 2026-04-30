use keyring::Entry;

const SERVICE_NAME: &str = "com.veloxdb.app";

fn entry(connection_id: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, connection_id).map_err(|e| format!("Keychain error: {}", e))
}

pub fn store_password(connection_id: &str, password: &str) -> Result<(), String> {
    entry(connection_id)?
        .set_password(password)
        .map_err(|e| format!("Failed to store password in keychain: {}", e))
}

pub fn get_password(connection_id: &str) -> Result<Option<String>, String> {
    match entry(connection_id)?.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read password from keychain: {}", e)),
    }
}

pub fn delete_password(connection_id: &str) -> Result<(), String> {
    match entry(connection_id)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete password from keychain: {}", e)),
    }
}
