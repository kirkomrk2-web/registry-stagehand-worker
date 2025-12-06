#!/usr/bin/env node
/**
 * Тест на CompanyBook API директно - проверка за английски имена
 */

// Пробваме с една от фирмите от теста
const TEST_EIK = '203408831'; // ИВВА 2015

console.log(`\n🔍 Тестване на CompanyBook API за EIK: ${TEST_EIK}\n`);

async function testCompanyDetails(eik) {
  const url = `https://api.companybook.bg/api/companies/${eik}?with_data=true`;
  
  console.log(`📡 Request: ${url}\n`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const company = data?.company || data;
    
    console.log('📊 COMPANY DATA:\n');
    console.log('Basic Info:');
    console.log(`  - Name (BG): ${company.name || 'N/A'}`);
    console.log(`  - UIC/EIK: ${company.uic || company.eik || 'N/A'}`);
    console.log(`  - Legal Form: ${company.legalForm || 'N/A'}`);
    console.log(`  - Status: ${company.status || 'N/A'}`);
    console.log('');
    
    console.log('🔍 SEARCHING FOR ENGLISH NAME IN ALL FIELDS:\n');
    
    // Check common fields
    if (company.name_en) {
      console.log(`✅ Found: company.name_en = "${company.name_en}"`);
    } else {
      console.log('❌ company.name_en = NOT FOUND');
    }
    
    if (company.companyNameTransliteration) {
      console.log(`✅ Found: company.companyNameTransliteration = ${JSON.stringify(company.companyNameTransliteration)}`);
    } else {
      console.log('❌ company.companyNameTransliteration = NOT FOUND');
    }
    
    if (company.transliteration) {
      console.log(`✅ Found: company.transliteration = ${JSON.stringify(company.transliteration)}`);
    } else {
      console.log('❌ company.transliteration = NOT FOUND');
    }
    
    if (company.nameEn) {
      console.log(`✅ Found: company.nameEn = "${company.nameEn}"`);
    } else {
      console.log('❌ company.nameEn = NOT FOUND');
    }
    
    // Check in registerInfo
    if (company.registerInfo) {
      console.log('\n📋 Register Info:');
      console.log(JSON.stringify(company.registerInfo, null, 2));
    }
    
    // Full company object dump
    console.log('\n📦 FULL COMPANY OBJECT:');
    console.log(JSON.stringify(company, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCompanyDetails(TEST_EIK).catch(console.error);
