export default () => ({
  port: parseInt(process.env.PORT || '8095', 10),
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    uploadVisibility: process.env.YOUTUBE_UPLOAD_VISIBILITY || 'private',
    serviceApiKey: process.env.YOUTUBE_SERVICE_API_KEY || 'investingatti-youtube-key-dev',
    channelId: process.env.YOUTUBE_CHANNEL_ID || 'UC3rrbrUCi0_MTjRummFRewA',
  },
  databaseUrl: process.env.DATABASE_URL || '',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  backendCallbackApiKey: process.env.CURRENT_APP_CALLBACK_API_KEY || 'investingatti-callback-key-dev',
});
