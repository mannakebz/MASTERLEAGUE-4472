declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      DATABASE_AUTH_TOKEN: string;
      BETTER_AUTH_SECRET: string;
      APPLICATION_ID: string;
      VITE_RUNABLE_AUTH_ISSUER: string;
      MASTER_LEAGUE_ADMIN_EMAIL?: string;
      S3_ENDPOINT: string;
      S3_BUCKET: string;
      S3_ACCESS_KEY_ID: string;
      S3_SECRET_ACCESS_KEY: string;
      VAPID_PUBLIC_KEY?: string;
      VAPID_PRIVATE_KEY?: string;
      VAPID_SUBJECT?: string;
    }
  }
}
export {};
