import { observable, action } from 'mobx'
import axios from 'axios'

class Store {
  @observable instance = axios.create({
    baseURL: window.location.hostname === 'localhost' ? 'http://localhost:10025' : 'https://mail-2.fruitice.fr',
    timeout: 2000,
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
  @observable msgId = ''

}

export default new Store()
