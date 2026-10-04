package config

const credentialTargetPrefix = "NoVacDB Studio/"

// TargetName formats the credential manager target key for a connection ID.
func targetName(connID string) string {
	return credentialTargetPrefix + connID
}
