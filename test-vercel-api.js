// Script de teste para verificar se a API do Vercel funciona no frontend
// Execute este código no console do navegador na página do LeadPageEditor

async function testVercelAPI() {
  const domain = 'test-frontend-123.com';
  const accessToken = 'gfbViYOt4gIVY9WxmbwQV3pl';
  const projectId = 'prj_Co6irMeZcJlH4rOuckPmO5NYCmrj';

  const url = `https://api.vercel.com/v10/projects/${projectId}/domains`;

  console.log('🔧 Testando API do Vercel no frontend...');
  console.log('📋 Domínio:', domain);
  console.log('🔗 URL:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    console.log('📊 Status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro:', error);
      return false;
    }

    const result = await response.json();
    console.log('✅ Sucesso:', result);
    return true;
  } catch (error) {
    console.error('💥 Erro de rede:', error);
    return false;
  }
}

// Execute o teste
testVercelAPI();