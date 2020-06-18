import Vue from 'vue'
import App from './Vue/App.vue'
import VueNoty from 'vuejs-noty'
import router from './Vue/router'
import store from './Vue/store'
import CompositionApi from '@vue/composition-api'

Vue.config.productionTip = false

Vue.use(VueNoty, {
	layout: 'bottomLeft'
})
Vue.use(CompositionApi)

new Vue({
	router,
	store: store.original,
	render: h => h(App)
}).$mount('#app')
