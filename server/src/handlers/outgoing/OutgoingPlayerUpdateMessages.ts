import ServerPlayer from '../../libraries/players/ServerPlayer'
import ServerPlayerInGame from '../../libraries/players/ServerPlayerInGame'
import PlayerInGameMessage from '../../shared/models/network/PlayerInGameMessage'
import HiddenPlayerInGameMessage from '../../shared/models/network/HiddenPlayerInGameMessage'

export default {
	notifyAboutPlayerTimeBankChange: (player: ServerPlayer, playerInGame: ServerPlayerInGame) => {
		player.sendMessage({
			type: 'update/player/self/timeUnits',
			data: PlayerInGameMessage.fromPlayerInGame(playerInGame)
		})
	},

	notifyAboutOpponentTimeBankChange: (player: ServerPlayer, playerInGame: ServerPlayerInGame) => {
		player.sendMessage({
			type: 'update/player/opponent/timeUnits',
			data: HiddenPlayerInGameMessage.fromPlayerInGame(playerInGame)
		})
	}
}