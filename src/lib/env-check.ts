// Environment variable validation for Next.js build/runtime

export function validateEnv() {
    console.log('Validating environment variables...');
    const requiredEnvVars = [
        'DATABASE_URL',
        'OPENAI_API_KEY',
        'JWT_SECRET',
    ];

    const missingVars = requiredEnvVars.filter(
        (envVar) => !process.env[envVar]
    );

    if (missingVars.length > 0) {
        console.error(
            `❌ Invalid environment variables: Missing ${missingVars.join(', ')}`
        );
        // Throwing error causes the Next.js build to fail cleanly on Vercel
        throw new Error(
            `Missing required environment variables: ${missingVars.join(
                ', '
            )}. Please add them to your Vercel project settings or .env.local file.`
        );
    }

    console.log('✅ Environment validation passed.');
}
