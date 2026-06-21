export const getEnvPath = (serviceName: string): string | null => {
  const envVarName = `${serviceName.toUpperCase()}_SERVICE_LINK`;
  const envVarValue = process.env[envVarName];

  return envVarValue || null;
};