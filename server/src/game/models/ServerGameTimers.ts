import ServerGame from './ServerGame'
import ServerBotPlayerInGame from '../AI/ServerBotPlayerInGame'

class ReusableTimeout {
	game: ServerGame
	callback: () => void
	timeout: number
	timeoutHandle: NodeJS.Timeout | null

	constructor(game: ServerGame, callback: () => void, timeout: number) {
		this.game = game
		this.callback = callback
		this.timeout = timeout
		this.timeoutHandle = null
	}

	public start(): void {
		if (this.timeoutHandle || !this.game.isStarted) {
			return
		}
		this.timeoutHandle = setTimeout(this.callback, this.timeout)
	}

	public stop(): void {
		if (!this.timeoutHandle) {
			return
		}
		clearTimeout(this.timeoutHandle)
		this.timeoutHandle = null
	}
}

export default class ServerGameTimers {
	game: ServerGame
	playerLeaveTimeout: ReusableTimeout

	constructor(game: ServerGame) {
		this.game = game

		this.playerLeaveTimeout = new ReusableTimeout(game, () => {
			const victoriousPlayer = game.players.find(player => player.player.isInGame() || player instanceof ServerBotPlayerInGame) || null
			game.finish(victoriousPlayer, 'Opponent disconnected')
		}, 60000)
	}
}
