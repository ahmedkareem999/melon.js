// / Remark: Code mostly taken from: https://github.com/makerdao/maker-market
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';

import web3 from '/imports/lib/client/ethereum/web3';
import store from '/imports/startup/client/store';
import { types } from '/imports/actions/network';


// Check which accounts are available and if defaultAccount is still available,
// Otherwise set it to localStorage, Session, or first element in accounts
function checkAccounts() {
  web3.eth.getAccounts((error, accounts) => {
    if (error) Session.set('isClientConnected', false);
    else if (!error) {
      if (!_.contains(accounts, web3.eth.defaultAccount)) {
        if (_.contains(accounts, localStorage.getItem('selectedAccount'))) {
          web3.eth.defaultAccount = localStorage.getItem('selectedAccount');
        } else if (_.contains(accounts, Session.get('selectedAccount'))) {
          web3.eth.defaultAccount = Session.get('selectedAccount');
        } else if (accounts.length > 0) {
          web3.eth.defaultAccount = accounts[0];
        } else {
          web3.eth.defaultAccount = undefined;
        }
      }
      localStorage.setItem('selectedAccount', web3.eth.defaultAccount);
      web3.eth.getBalance(web3.eth.defaultAccount, (error, result) => {
        if (!error) {
          Session.set('selectedAccountBalance', result.toNumber());
        } else {
          Session.set('selectedAccountBalance', undefined);
        }
      });
      Session.set('selectedAccount', web3.eth.defaultAccount);
      Session.set('getAccountCount', accounts.length);
      Session.set('clientAccountList', accounts);
      Session.set('isClientConnected', true);
    }
  });
}

// CHECK FOR NETWORK
function checkNetwork() {
  let network;
  switch (web3.version.network) {
    case '4':
      network = 'Rinkeby';
      break;
    case '3':
      network = 'Ropsten';
      break;
    case '42':
      network = 'Kovan';
      break;
    case '1':
      network = 'Main';
      break;
    default:
      network = 'Private';
  }
  Session.set('network', network);
  checkAccounts();
}

function initSession() {
  Session.set('network', false);
  Session.set('isClientConnected', false);
  Session.set('highestBlock', 0);
  Session.set('fromPortfolio', true);
  Session.set('selectedOrderId', null);
  Session.set('showModal', true);
}

function checkIfSynching() {
  web3.eth.isSyncing((e, r) => {
    if (!e) {
      if (r) {
        /* sync object:
        {
           startingBlock: 300,
           currentBlock: 312,
           highestBlock: 512
        }
        */
        Session.set('startingBlock', r.startingBlock);
        Session.set('currentBlock', r.currentBlock);
        Session.set('highestBlock', r.highestBlock);
      } else {
        Session.set('isSynced', true);
        checkNetwork();
      }
    } else {
      console.error(`Error: ${e} \nIn web3.eth.isSyncing`);
    }
  });
}

function initWeb3() {
  if (window.web3 === undefined) {
    store.dispatch({
      type: types.SET_PROVIDER,
      provider: 'LocalNode',
    });
  } else {
    store.dispatch({
      type: types.SET_PROVIDER,
      provider: (() => {
        if (window.web3.currentProvider.isMetaMask) {
          return 'MetaMask';
        }
        return 'Unknown';
      })(),
    });
  }

  // HACK: To prevent usage of window.web3
  window.web3Initialised = true;
}

// EXECUTION
Meteor.startup(() => {
  console.log('Meteor Startup');
  initSession();
  checkNetwork();
  checkIfSynching();

  Session.set('isServerConnected', true); // TODO: check if server is connected

  initWeb3();
});
