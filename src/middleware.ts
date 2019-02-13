import { JolocomLib } from "jolocom-lib";
import { RedisApi, RequestWithInteractionTokens } from "./types";
import { NextFunction, Response } from "express";
import {CredentialResponse} from 'jolocom-lib/js/interactionTokens/credentialResponse'
import {CredentialRequest} from 'jolocom-lib/js/interactionTokens/credentialRequest'
import {areArraysEqual} from './helpers'
import {claimsMetadata} from 'cred-types-jolocom-demo'

export const validateSentInteractionToken = async (
  req: RequestWithInteractionTokens,
  res: Response,
  next: NextFunction
) => {
  try {
    const interactionToken = await JolocomLib.parse.interactionToken.fromJWT(
      req.body.token
    );

    if (!JolocomLib.util.validateDigestable(interactionToken)) {
      res.status(401).send("Invalid signature on interaction token");
    }

    req.userResponseToken = interactionToken;
    next();
  } catch (err) {
    res
      .status(401)
      .send(`Could not parse interaction token - ${err.message}`);
  }
};

export const matchAgainstRequest = (redis: RedisApi) => async (
  req: RequestWithInteractionTokens,
  res: Response,
  next: NextFunction
) => {
  const sentRequestJWT = await redis.getAsync(req.userResponseToken.nonce);

  if (!sentRequestJWT) {
    res.status(401).send("No request token found");
  }

  const { request: requestToken } = JSON.parse(sentRequestJWT);

  try {
    req.serviceRequestToken = JolocomLib.parse.interactionToken.fromJWT(requestToken);
  } catch (err) {
    res
      .status(401)
      .send(`Failed to decode request token - ${err.message}`);
  }

  next();
};

export const validateCredentialsAgainstRequest = async (req: RequestWithInteractionTokens, res: Response, next: NextFunction) => {
  const response = req.userResponseToken.interactionToken as CredentialResponse;
  const request = req.serviceRequestToken.interactionToken as CredentialRequest;

  if (!response.satisfiesRequest(request)) {
    res
    .status(401)
    .send(
      "The supplied credentials do not match the types of the requested credentials"
    );
  }

 next()
}

export const validateAKaartNumber = async (req: RequestWithInteractionTokens, res: Response, next: NextFunction) => {
  const { suppliedCredentials } = req.userResponseToken.interactionToken as CredentialResponse
  const aKaartCredential = suppliedCredentials.find(credential => areArraysEqual(credential.type, claimsMetadata.akaart.type))

  if(!aKaartCredential) {
    res.status(401).send('No A-Kaart credential was found')
  }

  const { identifier: aKaartIdentifier } = aKaartCredential.claim

  const aKaartRecord = {
    success: true,
    identifier: aKaartIdentifier as string
  }

  try {
    const { pointsBalance } = { pointsBalance: 400 } // const points = (await axios(endpoint/cards/identifier)).data
    req.middlewareData = {
      ...aKaartRecord,
      points: pointsBalance,
    }
    next()
  } catch(err) {
    req.middlewareData = {
      ...aKaartRecord,
      success: false,
      error: err.message
    }
    res.status(401).send('Could not validate A-Kaart account')
  }
}
