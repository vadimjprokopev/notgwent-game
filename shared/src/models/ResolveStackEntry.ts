import OwnedCard from './OwnedCard'
import CardTarget from './CardTarget'

export default interface ResolveStackEntry {
	ownedCard: OwnedCard
	targetsSelected: CardTarget[]
}
