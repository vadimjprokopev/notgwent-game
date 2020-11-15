import express, {Response} from 'express'
import RequireAdminAccessLevelMiddleware from '../middleware/RequireAdminAccessLevelMiddleware'
import PlayerLibrary from '../game/players/PlayerLibrary'
import AsyncHandler from '../utils/AsyncHandler'
import OpenPlayerMessage from '@shared/models/network/player/OpenPlayerMessage'
import RequireSupportAccessLevelMiddleware from '../middleware/RequireSupportAccessLevelMiddleware'
import RequireOriginalPlayerTokenMiddleware from '../middleware/RequireOriginalPlayerTokenMiddleware'
import TokenManager from '../services/TokenService'
import {getPlayerFromAuthenticatedRequest} from '../utils/Utils'

const router = express.Router()

router.use(RequireOriginalPlayerTokenMiddleware)
router.use(RequireSupportAccessLevelMiddleware)

router.get('/players', AsyncHandler(async(req, res: Response) => {
	const players = await PlayerLibrary.getAllPlayers()
	const playerMessages = players?.map(player => new OpenPlayerMessage(player)) || []
	res.json(playerMessages)
}))

router.use(RequireAdminAccessLevelMiddleware)

router.post('/players/:playerId/login', AsyncHandler(async(req, res: Response) => {
	const currentPlayer = getPlayerFromAuthenticatedRequest(req)
	const targetPlayerId = req.params['playerId']
	if (!targetPlayerId) {
		throw { status: 400, error: 'Missing playerId' }
	}

	if (currentPlayer.id === targetPlayerId) {
		throw { status: 403, error: 'Can\'t impersonate self' }
	}

	const player = await PlayerLibrary.loginById(targetPlayerId)
	if (!player) {
		throw { status: 400, error: 'Player id invalid' }
	}

	const playerToken = TokenManager.generateJwtToken(player)
	const originalPlayerToken = TokenManager.generateJwtToken(currentPlayer)
	res.cookie('playerToken', playerToken, { maxAge: 7 * 24 * 3600 * 1000, httpOnly: true, sameSite: true })
	res.cookie('originalPlayerToken', originalPlayerToken, { maxAge: 7 * 24 * 3600 * 1000, httpOnly: true, sameSite: true })

	res.status(204)
	res.send()
}))

module.exports = router
