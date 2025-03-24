require('dotenv').config();
const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(require('cors')());

app.get('/run-script', async (req, res) => {

  const token = req.headers.authorization; // Captura o token enviado no cabeçalho

  if (!token || token !== `Bearer ${process.env.TOKEN_SECRET}`) {
    return res.status(403).json({ error: "🚫 Acesso negado. Token inválido!" });
  }

  try {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://cliente.tjtelecom.com.br/adm.php');

    // Login
    await page.fill('#email', process.env.EMAIL);
    await page.click('#btn-next-login');
    await page.fill('#password', process.env.PASSWORD);
    await page.click('#btn-enter-login');
    await page.click('#btn-enter-login');

    // Navegação
    await page.click('#menu76420e3e2ec10bca79d6bfcc6356354c');
    await page.click('a:text("Ordens de serviços")');

    // Aplicando filtros
    await page.fill('#assunto', 'RETIRADA');
    const statusList = ['#status_A', '#status_DS', '#status_EX', '#status_AN', '#status_EN', '#status_AS', '#status_RAG'];
    for (const status of statusList) {
      await page.click(status);
    }

    // Data de hoje
    const hoje = new Date();
    const dataAtual = hoje.toLocaleDateString('pt-BR');
    await page.fill('#dataAte', dataAtual);
    await page.fill('#dataDe', dataAtual);

    await page.click('#tipo_dE');
    await page.click('#tipo_dV');
    await page.click('#su_oss_chamado_apply_filter');

    // Processamento contínuo das OS
    while (true) {
      await page.waitForSelector('tr', { state: 'visible', timeout: 3000 });
      const rows = await page.locator('tr');
      const totalLinhas = await rows.count();

      if (totalLinhas === 0) {
        console.log('✅ Nenhuma OS restante para reagendar.');
        await page.close();
        await browser.close(); // Fecha o navegador completamente
        process.exit(0);
      }

      try {
        const row = rows.nth(0); // Sempre pega a primeira linha disponível
        await row.click(); // Abre o formulário

        // Aguarda o modal abrir
        await page.waitForSelector('#print_form', { state: 'visible', timeout: 5000 });

        // Clicar no botão "Ações"
        const acoesButton = await page.locator('nav.ixc-buttons#print_form[group="Ações"]');
        await acoesButton.click();
        await page.waitForTimeout(1000); // Pequeno delay antes de seguir para a próxima OS


        // Selecionar "Necessário reagendar"
        const reagendarOption = await page.locator('li[group="Ações"][name="reagendamento"]');
        await reagendarOption.click();

        await page.fill('#mensagem', 'Reagendado devido ao horário.');
        await page.waitForTimeout(1000); // Pequeno delay antes de seguir para a próxima OS


        // Clicar no botão "Salvar" (Alt+S)
        await page.click('button[title="Alt+S"]');


        console.log('🔄 OS reagendada com sucesso.');

        await page.waitForTimeout(3000); // Pequeno delay antes de seguir para a próxima OS

      } catch (error) {
        console.error('🚨 Erro ao processar OS:', error.message);
        break;
      }
    }

    console.log('✅ Processo concluído.');
    await browser.close();

    res.json({ message: "✅ Script executado com sucesso!" });
  } catch (error) {
    console.error('🚨 Erro ao executar o script:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
