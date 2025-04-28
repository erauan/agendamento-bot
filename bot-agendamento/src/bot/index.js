//const { use } = require('framer-motion/client');
//const { get } = require('http');
//const { start } = require('repl');
//const agendamentoRepository = require('../repository/agendamentoRepository');
const fs = require('fs');
const venom = require('venom-bot');
const empresaRepository = require('../repository/empresaRepository');
const start = require('./fluxo');
const { error } = require('console');


// 1. Configuração do Venom-Bot
venom.create({
  session: 'barbetot',
  headless: false,
  multidevice: true,
  disableWelcome: true,
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
}).then(async (client) => {
  console.log('✅ Bot conectado ao WhatsApp!');

  let botNumber;

    // SOLUÇÃO: Obter número alternativamente
    try{
    const me = await client.getMe();
    botNumber = me.id.user;
  } catch (e) {
    try {
      // Método alternativo
      const sessionData = await client.getSessionTokenBrowser();
      botNumber = sessionData.wid.user.replace('c.us', '');
    } catch (e) {
      console.error('❌ Não foi possível obter o número do bot');
      // Fallback
      botNumber = "NÚMERO_DO_BOT"; // Insira manualmente se necessário
    }
  }
    console.log('🔢 Número do bot:', botNumber);

     // Vinculação com empresa
     const empresaAtual = empresaRepository.findEmpresaByNumber(botNumber);
     if (!empresaAtual) {
       console.warn('⚠️ Número não cadastrado em empresas.json. Usando configuração padrão.');
       start(client, {
         id: "padrao",
         nome: "Barbearia",
         servicos: [],
         horarios: [],
         fluxo: []
       });
     } else {
       console.log(`🏢 Vinculado à: ${empresaAtual.nome}`);
       start(client, empresaAtual);
     }

  // 2. Verificação de conexão periódica
  setInterval(async () => {
    try {
      const state = await client.getConnectionState();
      if (state !== 'CONNECTED') {
        console.log('⚠️ Verificando conexão...');
      }
    } catch (e) {
      console.error('❌ Erro na verificação de conexão:', e);
    }
  }, 300000); // a cada 5 minutos

}).catch(error => {
  console.error('❌ Falha na inicialização do bot:', error);
  process.exit(1);
});