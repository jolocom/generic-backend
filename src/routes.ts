import { Express } from 'express'
import { IdentityWallet } from 'jolocom-lib/js/identityWallet/identityWallet'
import { registration } from './controllers/registration'
import { issuance } from './controllers/issuance'
import { authentication } from './controllers/authentication'
import { RedisApi } from './types'
import { Endpoints } from './sockets'
import {
  matchAgainstRequest,
  validateCredentialsAgainstRequest,
  validateSentInteractionToken
} from './middleware'
import { addCustomAuthnMiddleware } from './customHandlers/customMiddleware'

export const configureDefaultRoutes = (
  app: Express,
  redis: RedisApi,
  identityWallet: IdentityWallet
) => {
  app
    .route(Endpoints.share)
    .get(registration.generateCredentialShareRequest(identityWallet, redis))
    .post(
      validateSentInteractionToken,
      matchAgainstRequest(redis),
      validateCredentialsAgainstRequest,
      addCustomAuthnMiddleware(redis),
      registration.consumeCredentialShareResponse(redis)
    )

  app
    .route(Endpoints.receive)
    .get(issuance.generateCredentialOffer(identityWallet, redis))
    .post(
      validateSentInteractionToken,
      matchAgainstRequest(redis),
      issuance.consumeCredentialOfferResponse(identityWallet, redis)
    )

  app
    .route(Endpoints.auth)
    .get(authentication.generateAuthenticationRequest(identityWallet, redis))
    .post(
      validateSentInteractionToken,
      matchAgainstRequest(redis),
      authentication.consumeAuthenticationResponse(identityWallet, redis)
    )
}
