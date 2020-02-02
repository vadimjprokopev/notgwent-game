import CardType from '../../../shared/enums/CardType'
import ServerCard from '../../../models/ServerCard'
import ServerGame from '../../../models/ServerGame'
import ServerTargetDefinition from '../../../models/ServerTargetDefinition'
import CardTribe from '../../../shared/enums/CardTribe'
import ServerGameBoardRow from '../../../models/ServerGameBoardRow'
import ServerCardOnBoard from '../../../models/ServerCardOnBoard'
import ServerDamageInstance from '../../../models/ServerDamageSource'
import TargetMode from '../../../shared/enums/TargetMode'
import TargetType from '../../../shared/enums/TargetType'

export default class BuildingTreeOfLife extends ServerCard {
	constructor(game: ServerGame) {
		super(game, CardType.UNIT)
		this.basePower = 17
		this.baseAttack = 2
		this.attackRange = 3
		this.cardTribes = [CardTribe.BUILDING]
	}

	getUnitOrderTargetDefinition(): ServerTargetDefinition {
		return ServerTargetDefinition.default(this.game)
			.setTotalTargets(1)
			.allowType(TargetMode.ORDER_SUPPORT, TargetType.BOARD_ROW)
			.setOrderLabel(TargetMode.ORDER_SUPPORT, TargetType.BOARD_ROW, 'card.target.support.row')
			.requireValidation(TargetMode.ORDER_SUPPORT, TargetType.BOARD_ROW, args => {
				const targetRow = args.targetRow!
				let adjacentRows = this.game.board.getAdjacentRows(targetRow)
				return targetRow.cards.length > 0 || !!adjacentRows.find(row => row.cards.length > 0)
			})
	}

	onPerformingRowSupport(thisUnit: ServerCardOnBoard, target: ServerGameBoardRow): void {
		let adjacentRows = this.game.board.getAdjacentRows(target)

		target.cards.forEach(unit => {
			unit.heal(ServerDamageInstance.fromUnit(3, thisUnit))
		})
		adjacentRows.map(row => row.cards).flat().forEach(unit => {
			unit.heal(ServerDamageInstance.fromUnit(1, thisUnit))
		})
	}
}
