<template>
	<div class="the-escape-menu">
		<div class="the-escape-menu-container" @click="onMenuClick">
			<tenebrie-logo class="logo" />
			<button @click="onShowSettings" class="primary game-button">Settings</button>
			<button @click="onShowGameLog" class="primary game-button">Game history</button>
			<div class="menu-separator"></div>
			<button @click="onShowPlayersDeck" class="primary game-button">Your deck</button>
			<button @click="onShowPlayersGraveyard" class="primary game-button">Your graveyard</button>
			<div class="menu-separator"></div>
			<button @click="onShowOpponentsGraveyard" class="primary game-button">Opponent graveyard</button>
			<div class="menu-separator"></div>
			<button @click="onLeaveGame" class="primary game-button destructive">Leave game</button>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/Vue/store'
import TenebrieLogo from '@/Vue/components/utils/TenebrieLogo.vue'
import TheGameLog from '@/Vue/components/popup/gameLog/TheGameLog.vue'
import TheSimpleSettings from '@/Vue/components/popup/escapeMenu/TheSimpleSettings.vue'
import OutgoingMessageHandlers from '@/Pixi/handlers/OutgoingMessageHandlers'

export default {
	components: {
		TenebrieLogo,
	},

	setup() {
		const onMenuClick = (event: MouseEvent) => {
			event.cancelBubble = true
		}

		const onShowSettings = (): void => {
			store.dispatch.popupModule.open({
				component: TheSimpleSettings
			})
		}

		const onShowGameLog = (): void => {
			store.dispatch.popupModule.open({
				component: TheGameLog
			})
		}

		const onShowPlayersDeck = (): void => {
			store.dispatch.popupModule.close()
			OutgoingMessageHandlers.requestShowPlayersDeck()
		}

		const onShowPlayersGraveyard = (): void => {
			store.dispatch.popupModule.close()
			OutgoingMessageHandlers.requestShowPlayersGraveyard()
		}

		const onShowOpponentsGraveyard = (): void => {
			store.dispatch.popupModule.close()
			OutgoingMessageHandlers.requestShowOpponentsGraveyard()
		}

		const onLeaveGame = (): void => {
			store.dispatch.leaveGame()
			store.dispatch.popupModule.closeAll()
		}

		return {
			onMenuClick,
			onShowSettings,
			onShowGameLog,
			onShowPlayersDeck,
			onShowPlayersGraveyard,
			onShowOpponentsGraveyard,
			onLeaveGame,
		}
	},

}
</script>

<style scoped lang="scss">
	@import "src/Vue/styles/generic";

	.the-escape-menu {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.the-escape-menu-container {
		border-radius: 16px;
		width: 300px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: $COLOR_BACKGROUND_GAME_MENU_BORDER;
		padding: 16px 32px;

		button {
			width: 100%;
			margin: 8px;
		}
	}

	.menu-separator {
		width: 100%;
		height: 1px;
		margin: 8px 0;
		background: rgba(black, 0.7);
	}

	.logo {
		height: 170px;
	}
</style>
