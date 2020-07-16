import CardType from '@shared/enums/CardType'
import ServerCard from '../../../../models/ServerCard'
import ServerGame from '../../../../models/ServerGame'
import CardColor from '@shared/enums/CardColor'
import CardFeature from '@shared/enums/CardFeature'
import CardFaction from '@shared/enums/CardFaction'
import GameEventType from '@shared/enums/GameEventType'

export default class SpellFieryEntrance extends ServerCard {
	constructor(game: ServerGame) {
		super(game, CardType.SPELL, CardColor.GOLDEN, CardFaction.ARCANE)

		this.basePower = 8
		this.baseFeatures = [CardFeature.HERO_POWER]

		this.createCallback(GameEventType.EFFECT_SPELL_PLAY)
			.require(() => this.owner.cardDeck.unitCards.length > 0)
			.perform(() => {
				const owner = this.owner
				owner.summonCardFromUnitDeck(owner.cardDeck.unitCards[0])
			})
	}
}
