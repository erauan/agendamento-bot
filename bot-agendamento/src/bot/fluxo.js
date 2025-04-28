/**
 * Função principal que executa o fluxo de mensagens do bot
 * @param {object} client - Instância do venom-bot
 * @param {object} empresaAtual - Dados da empresa atual (nome, horarios, servicos, id, fluxo)
 */
import { motion } from 'framer-motion'

const { use } = require('framer-motion/client');
const agendamentoRepository = require('../repository/agendamentoRepository');
const empresaRepository = require('../repository/empresaRepository');

const TIMEOUT_SESSAO = 5 * 60 * 1000;
const estadoClientes = {}



function start(client, empresaAtual) {
  client.onMessage(async (message) => {
    console.log('\n📩 Mensagem recebida:');
    console.log('De:', message.from.replace('@c.us', ''));
    console.log('Texto:', message.body);
    console.log('---------------------');

    try {
      const user = message.from;
      const texto = message.body.trim().toLowerCase();

      // Debug: Resposta instantânea para teste
      if (texto === 'ping') {
        await client.sendText(user, '🏓 pong!');
        return;
      }

      if (estadoClientes[user]) {
        clearTimeout(estadoClientes[user].timeout);
        estadoClientes[user].timeout = setTimeout(() => {
          delete estadoClientes[user];
          client.sendText(user, '⌛ Sua sessão expirou por inatividade. Digite "Oi" para começar novamente.');
        }, TIMEOUT_SESSAO);
      }

      if (!estadoClientes[user]) {
        // Verificar saudação
        const saudacoes = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'fala', 'salve'];
        if (saudacoes.some(s => texto.includes(s))) {
          estadoClientes[user] = { etapa: 'menu_inicial', dados: {} };
          
          await client.sendText(
            user,
            `👋 Olá! Bem-vindo(a) à ${empresaAtual.nome}.\n\nComo posso te ajudar?\n\n1️⃣ *Agendar horário*\n2️⃣ *Falar com atendente*`
          );
          return;
        }
      }
      //se desejar fazer agendamento
      const estado = estadoClientes[user];
      if (!estado) return;

      // Fluxo de agendamento
      if (estado.etapa === 'menu_inicial') {
        if (texto === '1' || texto.includes('agendar')) {
          estado.etapa = 'coletar_nome';
          await client.sendText(user, 'Ótimo! Vamos começar seu agendamento. Qual o seu *nome* completo?');
        } else if (texto === '2' || texto.includes('atendente')) {
          estado.etapa = 'aguardando_atendente';
          await client.sendText(user, '💬 Tudo certo! Um atendente irá falar com você em breve. Por favor, aguarde...');
          //pode disparar um alerta para um painel futuramente
        } else {
          await client.sendText(user, 'Por favor, digite *1* para agendar ou *2* para falar com atendente.');
        }
      } 
      //nome
      else if (estado.etapa === 'coletar_nome') {
        const nome = message.body.trim();
        if (nome.length < 3) {
          await client.sendText(user, '❌ Nome muito curto. Por favor, informe seu nome completo.');
          return;
        }
        estado.dados.nome = nome;
        estado.etapa = 'coletar_telefone';
        await client.sendText(user, 'Perfeito! Agora me informe seu *telefone* com DDD (ex: 11999999999):');
      }
      //telefone
      else if (estado.etapa === 'coletar_telefone') {
        const telefone = message.body.replace(/\D/g, '');
        if (telefone.length < 10 || telefone.length > 11) {
          await client.sendText(user, '❌ O número parece inválido. Por favor, envie no formato correto: 11999999999');
        } else {
          estado.dados.telefone = telefone;
          estado.etapa = 'selecionar_servico';
          
          const servicos = empresaRepository.getServicos(empresaAtual.id);
          console.log('📦 Serviços disponíveis:', servicos);

            if (servicos.length > 0) {
                let listaServicos = servicos.map((s, i) => `${i + 1}. ${s.nome} - R$${s.valor}`).join('\n');
                await client.sendText(user, `✅ Informações registradas!\n\nAgora, selecione o serviço desejado:\n\n${listaServicos}`);

             } else {
                await client.sendText(user, '⚠️ Nenhum serviço disponível no momento.');
          }
        }
      }

      else if (estado.etapa === 'selecionar_servico') {
        const servicos = empresaRepository.getServicos(empresaAtual.id);
        const indice = parseInt(texto);
        if (isNaN(indice) || indice < 1 || indice > servicos.length) {
          await client.sendText(user, '❌ Opção inválida...');
          return;
        }
        const servicoEscolhido = servicos[indice - 1];
        
        if (!servicoEscolhido) {
          await client.sendText(user, '❌ Opção inválida. Por favor, responda com o número correspondente ao serviço.');
          return;
        }
        
        estado.dados.servicos = servicoEscolhido.nome;
        estado.dados.valor = servicoEscolhido.valor;
        estado.etapa = 'coletar_data';
        
        await client.sendText(user, `✨ Serviço escolhido: *${servicoEscolhido.nome}*`);
        await client.sendText(user, '📅 Agora me informe a *data* desejada para o agendamento (ex: 18/04/2025):');
      }
      else if (estado.etapa === 'coletar_data') {
        const regexData = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = message.body.match(regexData);
        
        if (!match) {
          await client.sendText(user, '❌ Formato de data inválido. Use o formato DD/MM/AAAA (ex: 18/04/2025)');
          return;
        }
        
        const [_, dia, mes, ano] = match;
        const dataInformada = new Date(Date.UTC(ano, mes - 1, dia));
        const hojeUTC = new Date(Date.UTC(
          new Date().getFullYear(), 
          new Date().getMonth(), 
          new Date().getDate()
        ));
        
        // Verifica se é um dia da semana válido (2-6 = terça a sábado)
        const diaSemana = dataInformada.getUTCDay();
        if (diaSemana < 2 || diaSemana > 6) {
          await client.sendText(user, '⚠️ Atendemos apenas de terça a sábado!');
          return;
        }
        
        if (dataInformada < hojeUTC) {
          await client.sendText(user, '📆 Essa data já passou. Por favor, escolha uma data futura.');
          return;
        }
        
        estado.dados.data = `${dia}/${mes}/${ano}`;
        estado.etapa = 'selecionar_horario';
        
        const horariosDisponiveis = empresaRepository.getHorarios(empresaAtual.id);
        let horariosMsg = horariosDisponiveis.map((h, i) => `${i + 1}️⃣ ${h}`).join('\n');
        
        await client.sendText(user, `✅ Data escolhida: *${estado.dados.data}*\n\nEscolha um horário disponível:\n\n${horariosMsg}`);
      }
      else if (estado.etapa === 'selecionar_horario') {
        const horariosDisponiveis = empresaRepository.getHorarios(empresaAtual.id);
        const indice = parseInt(texto) - 1;
        
        if (isNaN(indice) || indice < 0 || indice >= horariosDisponiveis.length) {
          await client.sendText(user, '❌ Opção inválida. Responda com o número correspondente ao horário desejado.');
          return;
        }
        
        estado.dados.horario = horariosDisponiveis[indice];
        estado.etapa = 'selecionar_barbeiro';
        
        await client.sendText(
          user,
          `⏰ Horário escolhido: *${estado.dados.horario}*\n\nAgora selecione o *barbeiro*:\n\n` +
          '1️⃣ Lucas\n2️⃣ Flavio\n3️⃣ Rauan'
        );
      }
      else if (estado.etapa === 'selecionar_barbeiro') {
        const barbeiros = empresaRepository.getBarbeiros(empresaAtual.id);
      
        if (!barbeiros.length) {
          await client.sendText(user, '⚠️ Nenhum barbeiro disponível no momento.');
          delete estadoClientes[user];
          return;
        }
      
        const indice = parseInt(texto);
        if (isNaN(indice) || indice < 1 || indice > barbeiros.length) {
          let listaBarbeiros = barbeiros.map((b, i) => `${i + 1}️⃣ ${b}`).join('\n');
          await client.sendText(user, `❌ Opção inválida. Escolha um barbeiro:\n\n${listaBarbeiros}`);
          return;
        }
      
        const barbeiroEscolhido = barbeiros[indice - 1];
        estado.dados.barbeiro = barbeiroEscolhido;
        estado.etapa = 'confirmacao';
      
        const resumo = `
      📋 *RESUMO DO AGENDAMENTO* 📋
      ━━━━━━━━━━━━━━━━━━━━━
      👤 *Nome*: ${estado.dados.nome}
      📱 *Telefone*: ${estado.dados.telefone}
      💈 *Serviço*: ${estado.dados.servicos}
      📅 *Data*: ${estado.dados.data}
      ⏰ *Horário*: ${estado.dados.horario}
      ✂️ *Barbeiro*: ${estado.dados.barbeiro}
      💰 *Valor*: R$ ${estado.dados.valor.toFixed(2)}
      ━━━━━━━━━━━━━━━━━━━━━
      
      *1* - ✅ Confirmar
      *2* - ❌ Cancelar
      `;
        await client.sendText(user, resumo);
      }
      
      else if (estado.etapa === 'confirmacao') {
        if (texto === '1') {
          const agendamento = estado.dados;
          agendamentoRepository.salvarAgendamento(empresaAtual.id, agendamento);
          await client.sendText(
            user, 
            `✅ Agendamento confirmado para ${agendamento.data} às ${agendamento.horario} com ${agendamento.barbeiro}.`
          );
          delete estadoClientes[user];
        } 
        else if (texto === '2') {
          await client.sendText(user, '❌ Agendamento cancelado. Diga "Oi" para recomeçar.');
          delete estadoClientes[user];
        } 
        else {
          await client.sendText(user, 'Responda com *1* para confirmar ou *2* para cancelar.');
        }
      }
    } catch (error) {
      console.error('❌ Falha real na conexão:', error);
    }
  });
}

module.exports = start;