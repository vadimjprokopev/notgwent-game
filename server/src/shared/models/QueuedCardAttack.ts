import CardOnBoard from './CardOnBoard'

export default class QueuedCardAttack {
	attacker: CardOnBoard
	target: CardOnBoard

	constructor(attacker: CardOnBoard, target: CardOnBoard) {
		this.attacker = attacker
		this.target = target
	}
}