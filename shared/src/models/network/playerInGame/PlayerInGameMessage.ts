import CardHandMessage from '../cardHand/CardHandMessage'
import CardDeckMessage from '../cardDeck/CardDeckMessage'
import PlayerMessage from '../player/PlayerMessage'

export default interface PlayerInGameMessage {
	player: PlayerMessage
	cardHand: CardHandMessage
	cardDeck: CardDeckMessage
	cardGraveyard: CardDeckMessage
	morale: number
	unitMana: number
	spellMana: number
}
