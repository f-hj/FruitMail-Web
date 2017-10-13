import { observable, action } from 'mobx'
import axios from 'axios'

class Store {
  @observable instance = axios.create({
    baseURL: 'https://mail-2.fruitice.fr',
    timeout: 1000,
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
}

export default new Store()
