import { createRemoteJWKSet, jwtVerify } from "jose"

export const verifyToken= async (req, res, next) => {
    const authHeader= req.headers.authorization
    if(!authHeader){
        return res.sendStatus(401)
    }
    const token= authHeader.split(" ")[1]
    if(!token){
        return res.sendStatus(401)
    }
    const JWKS= createRemoteJWKSet(new URL(process.env.JWKS_URL))
    try{
        const {payload}= await jwtVerify(token, JWKS)
        req.user = payload;
        next()
    }
    catch{
        res.sendStatus(403)
    }
}