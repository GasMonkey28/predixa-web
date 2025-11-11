import pino from 'pino'

const redactKeys = [
  'headers.authorization',
  'headers.cookie',
  'body.password',
  'body.token',
  'body.idToken',
  'body.accessToken',
  'body.secret',
  'body.apiKey',
]

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          singleLine: true,
        },
      }
    : undefined,
  redact: {
    paths: redactKeys,
    remove: true,
  },
  base: {
    service: 'predixa-web',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  },
})

