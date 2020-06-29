import AnimationMessage from '@shared/models/network/AnimationMessage'
import AnimationType from '@shared/enums/AnimationType'
import Core from '@/Pixi/Core'
import UnitAttackAnimParams from '@shared/models/animations/UnitAttackAnimParams'

const handlers: {[ index: number ]: (AnimationMessage, any) => number } = {
	[AnimationType.DELAY]: (message: AnimationMessage, params: void) => {
		return 500
	},

	[AnimationType.CARD_PLAY]: (message: AnimationMessage, params: void) => {
		const announcedCard = Core.opponent.cardHand.findCardById(message.targetCardId)!
		Core.mainHandler.announceCard(announcedCard)
		return 2000
	},

	[AnimationType.UNIT_ATTACK]: (message: AnimationMessage, params: UnitAttackAnimParams) => {
		const sourceUnit = Core.board.findUnitById(message.sourceUnitId)
		const damage = params.damage
		message.targetCardIDs.forEach(targetCardId => {
			const targetCard = Core.game.findRenderedCardById(targetCardId)
			Core.mainHandler.projectileSystem.createUnitAttackProjectile(sourceUnit, targetCard, 0)
		})
		return 500
	},

	[AnimationType.UNIVERSE_ATTACK]: (message: AnimationMessage, params: UnitAttackAnimParams) => {
		message.targetCardIDs.forEach(targetCardId => {
			const targetCard = Core.game.findRenderedCardById(targetCardId)
			Core.mainHandler.projectileSystem.createUniverseAttackProjectile(targetCard, 0)
		})
		return 500
	},

	[AnimationType.POST_UNIT_ATTACK]: (message: AnimationMessage, params: void) => {
		return 100
	},

	[AnimationType.UNIT_MOVE]: (message: AnimationMessage, params: void) => {
		return 750
	}
}

export default handlers
