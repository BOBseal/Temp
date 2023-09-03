const TelegramBot = require('node-telegram-bot-api');
const Web3 = require('web3');


const botToken = 'REPLACE_WITH_BOT_TOKEN';
const ethereumNodeURL = 'REPLACE_WITH_ALCHEMY_NODE_URL';
const bot = new TelegramBot(botToken, { polling: true });
const web3 = new Web3(ethereumNodeURL);

const waitForAmount = {};
 
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.first_name;
    bot.sendMessage(chatId, `Hello ${username}, I am SniperBot demo. \n\n Getting ready...`);
    bot.sendMessage(chatId, `Use /buy <pair address> to buy an erc20 token. \n\n  Use /sell <pair address> to sell an erc20 token.`);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/buy')) {
    const pairAddress = text.split(' ')[1];
    
    if (!web3.utils.isAddress(pairAddress)) {
      bot.sendMessage(chatId, 'Invalid pair address.');
      return;
    }

    bot.sendMessage(chatId, 'Enter the amount of ETH you want to spend on buying:');
    waitForAmount[chatId] = { type: 'buy', pairAddress };
  } else if (text.startsWith('/sell')) {
    const pairAddress = text.split(' ')[1];
    
    if (!web3.utils.isAddress(pairAddress)) {
      bot.sendMessage(chatId, 'Invalid pair address.');
      return;
    }

    bot.sendMessage(chatId, 'Enter the amount of tokens you want to sell:');
    waitForAmount[chatId] = { type: 'sell', pairAddress };
  } else if (waitForAmount[chatId]) {
    const amount = text.trim();
    const { type, pairAddress } = waitForAmount[chatId];
    delete waitForAmount[chatId];

    bot.sendMessage(chatId, 'An error occurred while processing the transaction.');
  }
});
