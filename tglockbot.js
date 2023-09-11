const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const token = '6343815466:AAFce-4Ip4HWhu6v4fxL6d9FV3j0xpQV68U'; // Replace with your actual bot token
const bot = new TelegramBot(token, { polling: true });

const userStates = new Map();

const chainIds = [
    { id: 1, name: 'Ethereum Mainnet' },
    { id: 56, name: 'Binance Smart Chain' },
    { id: 43114, name: 'Avalanche C-Chain' },
    { id: 250, name: 'Fantom Opera' },
    { id: 1101, name: 'Polygon zkEVM' },
    { id: 25, name: 'Cronos Mainnet Beta' },
    { id: 42161, name: 'Arbitrum One' },
    // Add more chain IDs as needed
];

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    const introMessage = `
    Welcome to the Token Locking and Unlocking Bot!

    You can use the following commands:
    - /lock: Lock ERC-20 tokens.
    - /unlock: Unlock previously locked ERC-20 tokens.
    - /mintToken: Mint a new token.

    To get started with locking, unlocking, or minting tokens, simply use the respective command. Follow the instructions provided by the bot.

    Enjoy using our service!
    `;

    bot.sendMessage(chatId, introMessage);
});

bot.onText(/\/lock/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Initialize user state for locking tokens
    userStates.set(userId, { action: 'lock', step: 'selectChainId' });

    // Generate an inline keyboard with buttons for selecting a chain ID
    const keyboard = {
        inline_keyboard: chainIds.map((chain) => [
            {
                text: chain.name,
                callback_data: `select_chain_${chain.id}`,
            },
        ]),
    };

    const replyMarkup = { reply_markup: JSON.stringify(keyboard) };

    bot.sendMessage(chatId, 'Please select a chain ID for locking tokens:', replyMarkup);
});

bot.onText(/\/unlock/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Initialize user state for unlocking tokens
    userStates.set(userId, { action: 'unlock', step: 'selectChainId' });

    // Generate an inline keyboard with buttons for selecting a chain ID
    const keyboard = {
        inline_keyboard: chainIds.map((chain) => [
            {
                text: chain.name,
                callback_data: `select_chain_${chain.id}`,
            },
        ]),
    };

    const replyMarkup = { reply_markup: JSON.stringify(keyboard) };

    bot.sendMessage(chatId, 'Please select a chain ID for unlocking tokens:', replyMarkup);
});

bot.onText(/\/mintToken/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Initialize user state for minting tokens
    userStates.set(userId, { action: 'mintToken', step: 'selectChainId' });

    // Generate an inline keyboard with buttons for selecting a chain ID
    const keyboard = {
        inline_keyboard: chainIds.map((chain) => [
            {
                text: chain.name,
                callback_data: `select_chain_${chain.id}`,
            },
        ]),
    };

    const replyMarkup = { reply_markup: JSON.stringify(keyboard) };

    bot.sendMessage(chatId, 'Please select a chain ID for minting tokens:', replyMarkup);
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const userState = userStates.get(userId);

    if (!userState || userState.step !== 'selectChainId') {
        bot.sendMessage(chatId, '...');
        return;
    }

    const selectedChainId = parseInt(callbackQuery.data.replace('select_chain_', ''));

    // Validate the selected chain ID
    const isValidChain = chainIds.some((chain) => chain.id === selectedChainId);

    if (!isValidChain) {
        bot.sendMessage(chatId, 'Invalid chain ID. Please select a valid chain ID.');
        return;
    }

    userState.chainId = selectedChainId;

    if (userState.action === 'mintToken') {
        // For mintToken action, proceed to token details
        userState.step = 'selectTokenDetails';
        bot.sendMessage(chatId, 'Please enter the token name:');
    } else {
        // For lock and unlock actions, proceed to the next step (selecting wallet address)
        userState.step = 'selectWalletAddress';
        bot.sendMessage(chatId, 'Please enter your wallet address for locking/unlocking:');
    }
});

bot.on('text', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userState = userStates.get(userId);

    if (!userState) {
        bot.sendMessage(chatId, '...');
        return;
    }

    if (userState.action === 'mintToken') {
        if (userState.step === 'selectTokenDetails') {
            if (!userState.tokenName) {
                userState.tokenName = msg.text.trim();
                bot.sendMessage(chatId, 'Please enter the token symbol:');
            } else if (!userState.tokenSymbol) {
                userState.tokenSymbol = msg.text.trim();
                bot.sendMessage(chatId, 'Please enter the initial supply:');
            } else if (!userState.initialSupply) {
                userState.initialSupply = msg.text.trim();

                // All required information for minting tokens has been collected
                const { tokenName, tokenSymbol, initialSupply, chainId } = userState;
                const frontEndURL = 'https://example.com'; // Replace with your actual front end URL

                try {
                    // Send the data to your front-end URL for handling minting logic
                    const response = await axios.post(frontEndURL, {
                        chainId,
                        tokenName,
                        tokenSymbol,
                        initialSupply,
                        action: 'mintToken', // Include the action in the data
                    });

                    // Generate a confirmation link
                    const confirmationLink = `${frontEndURL}/mintConfirmation/${chainId}/${tokenName}/${tokenSymbol}/${initialSupply}`;

                    // Respond to the user with the confirmation link
                    bot.sendMessage(chatId, `Token minting request sent. Confirm your transaction: ${confirmationLink}`);
                } catch (error) {
                    bot.sendMessage(chatId, `Error sending token minting request: ${error.message}`);
                } finally {
                    // Clear the user state after the interaction is complete
                    userStates.delete(userId);
                }
            }
        }
    } else if (!userState.walletAddress) {
        userState.walletAddress = msg.text.trim();
        const actionText = userState.action === 'lock' ? 'locking' : 'unlocking';
        bot.sendMessage(chatId, `Please enter the token address for ${actionText}:`);
    } else if (!userState.tokenAddress) {
        userState.tokenAddress = msg.text.trim();
        bot.sendMessage(chatId, 'Please enter the amount:');
    } else if (!userState.amount) {
        userState.amount = msg.text.trim();
        bot.sendMessage(chatId, 'Please enter the lock duration (in days):');
    } else if (!userState.lockDays) {
        userState.lockDays = msg.text.trim();

        // All required information for locking or unlocking tokens has been collected
        const { walletAddress, tokenAddress, amount, lockDays, action, chainId } = userState;
        const frontEndURL = 'https://example.com'; // Replace with your actual front end URL

        try {
            // Send the data to your front-end URL
            const response = await axios.post(frontEndURL, {
                chainId,
                userWalletAddress: walletAddress,
                tokenAddress,
                amount,
                lockDurationInDays: lockDays,
                action, // Include the action in the data
            });

            // Generate a confirmation link
            const confirmationLink = `${frontEndURL}/route/${chainId}/${walletAddress}/${tokenAddress}/${amount}/${lockDays}`;

            // Respond to the user with the confirmation link
            bot.sendMessage(chatId, `Tokens ${action} successfully. Confirm your transaction: ${confirmationLink}`);
        } catch (error) {
            bot.sendMessage(chatId, `Error ${action} tokens: ${error.message}`);
        } finally {
            // Clear the user state after the interaction is complete
            userStates.delete(userId);
        }
    }
});

// Rest of your bot code
