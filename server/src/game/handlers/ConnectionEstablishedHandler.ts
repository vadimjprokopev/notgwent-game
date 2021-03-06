import ServerGame from '../models/ServerGame'
import ServerPlayerInGame from '../players/ServerPlayerInGame'
import ServerPlayer from '../players/ServerPlayer'
import ServerBotPlayer from '../AI/ServerBotPlayer'
import Constants from '@shared/Constants'
import ServerPlayerSpectator from '../players/ServerPlayerSpectator'
import OutgoingMessageHandlers from './OutgoingMessageHandlers'
import Utils, {colorizeId, colorizePlayer, isCardPublic} from '../../utils/Utils'
import ServerCardTarget from '../models/ServerCardTarget'
import TargetMode from '@shared/enums/TargetMode'
import ServerBotPlayerInGame from '../AI/ServerBotPlayerInGame'

export default {
	onPlayerConnected(game: ServerGame, playerInGame: ServerPlayerInGame): void {
		if (!game.isStarted) {
			this.onPlayerConnectedInitially(game)
		} else {
			this.onPlayerReconnected(game, playerInGame)
		}
	},

	onPlayerConnectedInitially(game: ServerGame): void {
		const initializedPlayers = game.players.filter(playerInGame => playerInGame.initialized)
		if (initializedPlayers.length < Constants.PLAYERS_PER_GAME) {
			return
		}

		game.start()
	},

	onPlayerReconnected(game: ServerGame, playerInGame: ServerPlayerInGame): void {
		console.info(`Player ${colorizePlayer(playerInGame.player.username)} has reconnected to game ${colorizeId(game.id)}.`)
		game.timers.playerLeaveTimeout.stop()

		OutgoingMessageHandlers.sendPlayerSelf(playerInGame.player, playerInGame)
		const opponent = playerInGame.opponent
		if (opponent) {
			OutgoingMessageHandlers.sendPlayerOpponent(playerInGame.player, opponent)
			opponent.cardHand.allCards.filter(card => isCardPublic(card)).forEach(card => {
				OutgoingMessageHandlers.notifyAboutOpponentCardRevealed(playerInGame.player, card)
			})
			OutgoingMessageHandlers.notifyAboutDeckLeader(playerInGame, opponent, playerInGame.leader)
		}
		OutgoingMessageHandlers.sendBoardState(playerInGame.player, game.board)
		OutgoingMessageHandlers.sendStackState(playerInGame.player, game.cardPlay.cardResolveStack)
		if (game.activePlayer) {
			OutgoingMessageHandlers.sendActivePlayer(playerInGame.player, game.activePlayer)
		}
		if (playerInGame.targetRequired && game.cardPlay.cardResolveStack.currentCard) {
			OutgoingMessageHandlers.notifyAboutCardsMulliganed(playerInGame.player, playerInGame)
			OutgoingMessageHandlers.notifyAboutRequestedTargets(playerInGame.player, TargetMode.DEPLOY_EFFECT, game.cardPlay.getValidTargets())
		} else if (playerInGame.mulliganMode) {
			const cardsToMulligan = playerInGame.cardHand.unitCards
			const targets = Utils.sortCards(cardsToMulligan).map(card => ServerCardTarget.anonymousTargetCardInUnitDeck(TargetMode.MULLIGAN, card))
			OutgoingMessageHandlers.notifyAboutRequestedTargets(playerInGame.player, TargetMode.MULLIGAN, targets)
		}
		OutgoingMessageHandlers.notifyAboutValidActionsChanged(game, playerInGame)
		OutgoingMessageHandlers.notifyAboutGameStart(playerInGame.player, playerInGame.isInvertedBoard())
		game.events.flushLogEventGroup()
		OutgoingMessageHandlers.executeMessageQueueForPlayer(game, playerInGame.player)
	},

	onPlayerDisconnected(game: ServerGame, player: ServerPlayer): void {
		console.info(`Player ${colorizePlayer(player.username)} has disconnected from game ${colorizeId(game.id)}.`)
		player.spectators.forEach(spectator => spectator.player.disconnect())

		const connectedPlayers = game.players.filter(player => player.player.isInGame() || player instanceof ServerBotPlayerInGame)
		if (connectedPlayers.length === 1) {
			console.info(`Only one player left in game ${colorizeId(game.id)}. It will be shutdown in 60 seconds.`)
			game.timers.playerLeaveTimeout.start()
		}
	},

	onSpectatorConnected(game: ServerGame, spectator: ServerPlayerSpectator): void {
		const spectatedPlayerInGame = spectator.spectatedPlayer.playerInGame
		if (!spectatedPlayerInGame) {
			spectator.player.disconnect()
			return
		}
		const opponent = spectatedPlayerInGame.opponent
		if (!opponent) {
			spectator.player.disconnect()
			return
		}

		OutgoingMessageHandlers.notifyAboutSpectateMode(spectator.player)
		OutgoingMessageHandlers.sendPlayerSelf(spectator.player, spectatedPlayerInGame)
		OutgoingMessageHandlers.sendPlayerOpponent(spectator.player, opponent)
		opponent.cardHand.allCards.filter(card => isCardPublic(card)).forEach(card => {
			OutgoingMessageHandlers.notifyAboutOpponentCardRevealed(spectator.player, card)
		})
		OutgoingMessageHandlers.notifyAboutDeckLeader(spectator, opponent, spectatedPlayerInGame.leader)
		OutgoingMessageHandlers.sendBoardState(spectator.player, game.board)
		OutgoingMessageHandlers.sendStackState(spectator.player, game.cardPlay.cardResolveStack)
		if (game.activePlayer) {
			OutgoingMessageHandlers.sendActivePlayer(spectator.player, game.activePlayer)
		}
		if (spectatedPlayerInGame.targetRequired && game.cardPlay.cardResolveStack.currentCard) {
			OutgoingMessageHandlers.notifyAboutCardsMulliganed(spectator.player, spectatedPlayerInGame)
			OutgoingMessageHandlers.notifyAboutRequestedTargets(spectator.player, TargetMode.DEPLOY_EFFECT, game.cardPlay.getValidTargets())
		} else if (spectatedPlayerInGame.mulliganMode) {
			const cardsToMulligan = spectatedPlayerInGame.cardHand.unitCards
			const targets = Utils.sortCards(cardsToMulligan).map(card => ServerCardTarget.anonymousTargetCardInUnitDeck(TargetMode.MULLIGAN, card))
			OutgoingMessageHandlers.notifyAboutRequestedTargets(spectator.player, TargetMode.MULLIGAN, targets)
		}
		OutgoingMessageHandlers.notifyAboutValidActionsChanged(game, spectatedPlayerInGame)
		OutgoingMessageHandlers.notifyAboutGameStart(spectator.player, spectatedPlayerInGame.isInvertedBoard())
		game.events.flushLogEventGroup()
		OutgoingMessageHandlers.executeMessageQueueForPlayer(game, spectator.player)
	},
}
