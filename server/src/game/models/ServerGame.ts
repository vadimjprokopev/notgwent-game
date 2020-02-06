import uuidv4 from 'uuid/v4'
import Game from '../shared/models/Game'
import Player from '../shared/models/Player'
import ServerGameBoard from './ServerGameBoard'
import ServerPlayer from '../players/ServerPlayer'
import ServerChatEntry from './ServerChatEntry'
import VoidPlayerInGame from '../utils/VoidPlayerInGame'
import GameTurnPhase from '../shared/enums/GameTurnPhase'
import ServerCardDeck from './ServerCardDeck'
import ServerPlayerInGame from '../players/ServerPlayerInGame'
import OutgoingMessageHandlers from '../handlers/OutgoingMessageHandlers'
import GameLibrary from '../libraries/GameLibrary'
import ServerDamageInstance from './ServerDamageSource'
import Ruleset from '../Ruleset'
import Constants from '../shared/Constants'
import ServerBotPlayer from '../utils/ServerBotPlayer'
import ServerBotPlayerInGame from '../utils/ServerBotPlayerInGame'
import ServerCard from './ServerCard'
import ServerCardResolveStack from './ServerCardResolveStack'
import ServerGameCardPlay from './ServerGameCardPlay'
import ServerTemplateCardDeck from './ServerTemplateCardDeck'

export default class ServerGame extends Game {
	isStarted: boolean
	turnIndex: number
	currentTime: number
	turnPhase: GameTurnPhase
	owner: ServerPlayer
	board: ServerGameBoard
	players: ServerPlayerInGame[]
	chatHistory: ServerChatEntry[]
	cardPlay: ServerGameCardPlay
	playersToMove: ServerPlayerInGame[]

	constructor(owner: ServerPlayer, name: string) {
		super(uuidv4(), name)
		this.isStarted = false
		this.turnIndex = -1
		this.currentTime = -1
		this.turnPhase = GameTurnPhase.BEFORE_GAME
		this.owner = owner
		this.board = new ServerGameBoard(this)
		this.players = []
		this.playersToMove = []
		this.chatHistory = []
		this.cardPlay = new ServerGameCardPlay(this)
	}

	public addPlayer(targetPlayer: ServerPlayer, deck: ServerTemplateCardDeck): ServerPlayerInGame {
		let serverPlayerInGame
		if (targetPlayer instanceof ServerBotPlayer) {
			serverPlayerInGame = ServerBotPlayerInGame.newInstance(this, targetPlayer, deck)
		} else {
			serverPlayerInGame = ServerPlayerInGame.newInstance(this, targetPlayer, deck)
		}

		this.players.forEach((playerInGame: ServerPlayerInGame) => {
			OutgoingMessageHandlers.sendPlayerOpponent(playerInGame.player, serverPlayerInGame)
		})

		if (this.isBotGame()) {
			this.players.splice(0, 0, serverPlayerInGame)
		} else {
			this.players.push(serverPlayerInGame)
		}
		return serverPlayerInGame
	}

	public start(): void {
		this.isStarted = true

		const playerOne = this.players[0]
		const playerTwo = this.players[1] || VoidPlayerInGame.for(this)
		console.info(`Starting game ${this.id}: ${playerOne.player.username} vs ${playerTwo.player.username}`)

		this.players.forEach(playerInGame => {
			OutgoingMessageHandlers.sendPlayerSelf(playerInGame.player, playerInGame)
			OutgoingMessageHandlers.sendPlayerOpponent(playerInGame.player, this.getOpponent(playerInGame))
			OutgoingMessageHandlers.notifyAboutTimeAdvance(playerInGame.player, this.currentTime, Ruleset.MAX_TIME_OF_DAY)
			OutgoingMessageHandlers.notifyAboutGameStart(playerInGame.player, this.players.indexOf(playerInGame) === 1)
		})

		this.board.rows[Constants.GAME_BOARD_ROW_COUNT - 1].setOwner(playerOne)
		this.board.rows[0].setOwner(playerTwo)

		this.players.forEach(playerInGame => {
			playerInGame.cardDeck.shuffle()
			playerInGame.drawCards(10)
		})
		this.startNewTurnPhase()
	}

	public getPlayerInGame(player: Player): ServerPlayerInGame {
		return this.players.find(playerInGame => playerInGame.player === player)
	}

	public getOpponent(player: ServerPlayerInGame): ServerPlayerInGame {
		return this.players.find(otherPlayer => otherPlayer !== player) || VoidPlayerInGame.for(this)
	}

	public isBotGame(): boolean {
		return !!this.players.find(playerInGame => playerInGame instanceof ServerBotPlayerInGame)
	}

	public removePlayer(targetPlayer: ServerPlayer): void {
		const registeredPlayer = this.players.find(playerInGame => playerInGame.player.id === targetPlayer.id)
		if (!registeredPlayer) {
			return
		}

		this.players.splice(this.players.indexOf(registeredPlayer), 1)
		this.players.forEach((playerInGame: ServerPlayerInGame) => {
			// OutgoingMessageHandlers.notifyAboutPlayerDisconnected(playerInGame.player, targetPlayer)
		})
	}

	public createChatEntry(sender: ServerPlayer, message: string): void {
		const chatEntry = ServerChatEntry.newInstance(sender, message)
		this.chatHistory.push(chatEntry)
		this.players.forEach((playerInGame: ServerPlayerInGame) => {
			OutgoingMessageHandlers.notifyAboutChatEntry(playerInGame.player, chatEntry)
		})
	}

	public setTime(time: number): void {
		this.currentTime = time

		this.players.forEach(playerInGame => {
			OutgoingMessageHandlers.notifyAboutTimeAdvance(playerInGame.player, this.currentTime, Ruleset.MAX_TIME_OF_DAY)
		})
	}

	public setTurnPhase(turnPhase: GameTurnPhase): void {
		this.turnPhase = turnPhase

		this.board.getAllUnits().forEach(unit => unit.card.onTurnPhaseChanged(unit, this.turnPhase))

		this.players.forEach(playerInGame => {
			OutgoingMessageHandlers.notifyAboutPhaseAdvance(playerInGame.player, this.turnPhase)
		})
	}

	public isPhaseFinished(): boolean {
		return this.players.filter(playerInGame => !playerInGame.turnEnded).length === 0
	}

	public advanceTurn(): void {
		if (this.playersToMove.length > 0) {
			const playerToMove = this.playersToMove.shift()
			const timeUnits = ((this.currentTime === 0 && playerToMove === this.players[0]) || (this.currentTime === Ruleset.MAX_TIME_OF_DAY && playerToMove === this.players[0])) ? 1 : 1
			playerToMove.setTimeUnits(timeUnits)
			playerToMove.startTurn()
			return
		}

		if (this.isPhaseFinished()) {
			this.advancePhase()
		}
	}

	public advancePhase(): void {
		const playerOne = this.players[0]
		const playerTwo = this.players[1] || VoidPlayerInGame.for(this)
		const rowsOwnedByPlayerOne = this.board.rows.filter(row => row.owner === playerOne).length
		const rowsOwnedByPlayerTwo = this.board.rows.filter(row => row.owner === playerTwo).length
		const hasPlayerLostBoard = rowsOwnedByPlayerOne === 0 || rowsOwnedByPlayerTwo === 0

		if (this.turnPhase === GameTurnPhase.TURN_START) {
			this.startDeployPhase()
		} else if (this.turnPhase === GameTurnPhase.DEPLOY) {
			this.startEndTurnPhase()
		} else if (this.turnPhase === GameTurnPhase.TURN_END && !hasPlayerLostBoard && this.currentTime < Ruleset.MAX_TIME_OF_DAY) {
			this.startNewTurnPhase()
		} else if (this.turnPhase === GameTurnPhase.TURN_END && (hasPlayerLostBoard || this.currentTime === Ruleset.MAX_TIME_OF_DAY)) {
			this.startDayEndPhase()
		} else if (this.turnPhase === GameTurnPhase.COMBAT) {
			this.startNewTurnPhase()
		}
	}

	public startNewTurnPhase(): void {
		this.turnIndex += 1
		this.setTime(this.currentTime + 1)
		this.setTurnPhase(GameTurnPhase.TURN_START)

		this.playersToMove = this.players.slice()

		this.board.getAllUnits().forEach(unit => {
			unit.hasSummoningSickness = false
			unit.card.onTurnStarted(unit)
		})
		this.board.orders.clearPerformedOrders()
		this.advancePhase()
	}

	public startDeployPhase(): void {
		this.setTurnPhase(GameTurnPhase.DEPLOY)

		this.players.forEach(player => {
			OutgoingMessageHandlers.notifyAboutUnitValidOrdersChanged(this, player)
			OutgoingMessageHandlers.notifyAboutOpponentUnitValidOrdersChanged(this, this.getOpponent(player))
		})

		this.advanceTurn()
	}

	public startDayEndPhase(): void {
		this.setTurnPhase(GameTurnPhase.COMBAT)

		const playerOne = this.players[0]
		const playerTwo = this.players[1] || VoidPlayerInGame.for(this)

		const rowsOwnedByPlayerOne = this.board.rows.filter(row => row.owner === playerOne).length
		const rowsOwnedByPlayerTwo = this.board.rows.filter(row => row.owner === playerTwo).length
		playerOne.dealMoraleDamage(ServerDamageInstance.fromUniverse(rowsOwnedByPlayerTwo * 5))
		playerTwo.dealMoraleDamage(ServerDamageInstance.fromUniverse(rowsOwnedByPlayerOne * 5))

		const defeatedPlayer = this.players.find(player => player.morale <= 0) || null
		if (defeatedPlayer) {
			this.finish(this.getOpponent(defeatedPlayer), 'Win condition')
			return
		}

		this.board.getAllUnits().forEach(cardOnBoard => this.board.destroyUnit(cardOnBoard))
		this.setTime(-1)

		this.board.rows[Constants.GAME_BOARD_ROW_COUNT - 1].setOwner(playerOne)
		this.board.rows[0].setOwner(playerTwo)
		for (let i = 1; i < Constants.GAME_BOARD_ROW_COUNT - 1; i++) {
			this.board.rows[i].setOwner(null)
		}

		this.players.forEach(player => {
			player.drawCards(7)
		})

		this.advancePhase()
	}

	public startEndTurnPhase(): void {
		this.setTurnPhase(GameTurnPhase.TURN_END)
		this.board.getAllUnits().forEach(unit => unit.card.onTurnEnded(unit))
		this.advancePhase()
	}

	public finish(victoriousPlayer: ServerPlayerInGame, victoryReason: string): void {
		this.setTurnPhase(GameTurnPhase.AFTER_GAME)

		const defeatedPlayer = this.getOpponent(victoriousPlayer)
		OutgoingMessageHandlers.notifyAboutVictory(victoriousPlayer.player)
		OutgoingMessageHandlers.notifyAboutDefeat(defeatedPlayer.player)
		console.info(`Game ${this.id} finished. ${victoriousPlayer.player.username} won! [${victoryReason}]`)

		setTimeout(() => {
			const gameLibrary: GameLibrary = global.gameLibrary
			gameLibrary.destroyGame(this)
		}, 120000)
	}

	public findCardById(cardId: string): ServerCard | null {
		const cardInStack = this.cardPlay.cardResolveStack.findCardById(cardId)
		if (cardInStack) {
			return cardInStack.card
		}
		for (let i = 0; i < this.players.length; i++) {
			const player = this.players[i]
			const cardInHand = player.cardHand.findCardById(cardId)
			if (cardInHand) {
				return cardInHand
			}
			const cardInDeck = player.cardDeck.findCardById(cardId)
			if (cardInDeck) {
				return cardInDeck
			}
			const cardInGraveyard = player.cardGraveyard.findCardById(cardId)
			if (cardInGraveyard) {
				return cardInGraveyard
			}
		}
		return null
	}

	static newOwnedInstance(owner: ServerPlayer, name: string): ServerGame {
		const randomNumber = Math.floor(1000 + Math.random() * 9000)
		name = name || (owner.username + `'s game #${randomNumber}`)
		return new ServerGame(owner, name)
	}
}
