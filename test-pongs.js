const { chromium } = require('playwright')
const BASE = 'http://localhost:3001'

async function run() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  const R = []
  const pass = (t, d) => { R.push({t,s:'✅'}); console.log(`✅ ${t}: ${d}`) }
  const fail = (t, d) => { R.push({t,s:'❌'}); console.log(`❌ ${t}: ${d}`) }
  const info = (t, d) => console.log(`   ${t}: ${d}`)

  // ── SETUP: navigate to new quote ────────────────
  await page.goto(`${BASE}/quotes/new`)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/01-new-quote.png' })
  
  // Fill mandatory fields
  try {
    await page.locator('input').nth(0).fill('Test Client') // clientName
    await page.locator('input').nth(2).fill('Test Project') // projectName
  } catch(e) { console.log('fill error:', e.message) }
  
  // Find dim inputs - in mm mode
  const allInputs = await page.locator('input[type=number]').all()
  info('inputs found', allInputs.length)

  // Try to set dimensions - find by placeholder or position
  // QuoteBuilder renders CeilingItemForm with dim1/dim2 fields
  // Let's look at what's on the page first
  const pageText = await page.locator('body').textContent()
  info('page has dim fields', pageText.includes('dim') || pageText.includes('Dimension') || pageText.includes('Length'))

  await page.screenshot({ path: '/tmp/02-after-fill.png' })
  
  // Find dimension inputs within the item form
  // CeilingItemForm renders dim inputs - let's look at the HTML
  const numInputs = page.locator('input[type=number]')
  const count = await numInputs.count()
  info('number inputs count', count)
  
  for (let i = 0; i < Math.min(count, 8); i++) {
    const ph = await numInputs.nth(i).getAttribute('placeholder').catch(() => '')
    const val = await numInputs.nth(i).inputValue().catch(() => '')
    console.log(`   input[${i}] placeholder="${ph}" value="${val}"`)
  }

  // Set dim1 = 3000, dim2 = 4000 (they are usually the first two number inputs after quantity)
  // Quantity is also a number input so let's identify properly
  // dim1 input should have placeholder like "3000" or similar
  const dim1 = page.locator('input[placeholder="3000"], input[placeholder*="3000"]')
  if (await dim1.count()) {
    await dim1.fill('3000')
  } else {
    // Try by index - first number input in the ceiling item form
    if (count >= 2) {
      await numInputs.nth(0).fill('1') // quantity = 1
      await numInputs.nth(1).fill('3000') // dim1
      if (count >= 3) await numInputs.nth(2).fill('4000') // dim2
    }
  }
  
  await page.waitForTimeout(500)
  
  // Select Single Colour light type
  const scButtons = page.locator('button')
  const allBtns = await scButtons.all()
  for (const btn of allBtns) {
    const t = await btn.textContent().catch(() => '')
    if (t.trim() === 'Single Colour') { await btn.click(); break }
  }
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/03-single-colour.png' })

  // Check smart calc preview
  const preview = await page.locator('[class*="indigo-50"]').first().textContent().catch(() => '')
  info('smart calc preview', preview.substring(0, 400))
  
  if (preview.includes('Driver') && !preview.includes('EV1') && !preview.includes('V1 Controller') && !preview.includes('RT1')) {
    pass('T1-single-colour-no-EV1', 'Drivers shown, no EV1/V1/RT1')
  } else if (!preview) {
    fail('T1-single-colour-no-EV1', 'No preview visible - dims not set')
  } else {
    fail('T1-single-colour-no-EV1', `preview="${preview.substring(0, 200)}"`)
  }
  
  // Set proper dims if preview is empty
  if (!preview || !preview.includes('Fabric')) {
    // Try filling dims differently
    const inputs = await page.locator('input[type=number]').all()
    for (let i = 0; i < inputs.length; i++) {
      const ph = await inputs[i].getAttribute('placeholder').catch(() => '')
      info(`input[${i}]`, `placeholder="${ph}"`)
    }
    // Fill first two with 3000, 4000
    if (inputs.length >= 2) {
      await inputs[0].fill('3000')
      await inputs[1].fill('4000')
      await page.waitForTimeout(500)
    }
    const preview2 = await page.locator('[class*="indigo-50"]').first().textContent().catch(() => '')
    info('preview after dim fill', preview2.substring(0, 300))
  }
  
  await page.screenshot({ path: '/tmp/04-preview.png' })

  // TEST SAVE ──────────────────────────────────────
  // Fill client name first
  const textInputs = page.locator('input[type=text], input:not([type=number]):not([type=checkbox]):not([type=radio])')
  const tcount = await textInputs.count()
  info('text inputs', tcount)
  for (let i = 0; i < Math.min(tcount, 5); i++) {
    const ph = await textInputs.nth(i).getAttribute('placeholder').catch(() => '')
    const val = await textInputs.nth(i).inputValue().catch(() => '')
    console.log(`   textinput[${i}] placeholder="${ph}" value="${val}"`)
  }
  
  // Make sure client name filled
  const clientInput = page.locator('input[placeholder*="client" i], input[placeholder*="Client"]').first()
  if (await clientInput.count()) {
    await clientInput.fill('Test Client')
  }

  const saveBtn = page.locator('button:has-text("Save Quote")').first()
  if (await saveBtn.count()) {
    await saveBtn.click()
    await page.waitForTimeout(4000)
    const url = page.url()
    info('URL after save', url)
    if (url.includes('/team')) {
      pass('T8-save-redirect', `redirected to ${url}`)
    } else {
      fail('T8-save-redirect', `URL=${url}`)
    }
    
    const quoteId = url.match(/quotes\/([^/]+)/)?.[1]
    
    // TEST EDIT + RE-SAVE ────────────────────────
    if (quoteId) {
      await page.goto(`${BASE}/quotes/${quoteId}/edit`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: '/tmp/05-edit.png' })
      
      const pageContent = await page.locator('body').textContent()
      const hasItems = pageContent.includes('Fabric') || pageContent.includes('Gripper')
      info('edit page has ceiling items', hasItems)
      
      // Change a field - try fabric select
      const selects = page.locator('select')
      const selCount = await selects.count()
      info('selects on edit page', selCount)
      if (selCount > 0) {
        const opts = await selects.first().locator('option').all()
        info('first select options count', opts.length)
        await selects.first().selectOption({ index: 1 }) // pick second option
        await page.waitForTimeout(500)
      }
      
      const updateBtn = page.locator('button:has-text("Update Quote")').first()
      if (await updateBtn.count()) {
        await updateBtn.click()
        await page.waitForTimeout(4000)
        const urlAfter = page.url()
        if (urlAfter.includes('/team')) {
          pass('T9-edit-resave', `Updated and redirected to ${urlAfter}`)
        } else {
          fail('T9-edit-resave', `URL=${urlAfter}`)
        }
      } else {
        fail('T9-edit-resave', 'Update button not found')
      }
      
      // TEST CLIENT PDF ────────────────────────
      await page.goto(`${BASE}/quotes/${quoteId}/client`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: '/tmp/06-client-pdf.png' })
      const clientContent = await page.locator('body').textContent()
      const hasPongs = clientContent.includes('PONGS')
      const hasAmount = clientContent.includes('Amount') || clientContent.includes('₹')
      info('client pdf text (200 chars)', clientContent.substring(0, 200))
      if (hasPongs && hasAmount) {
        pass('T10-client-pdf', 'PDF renders with PONGS branding and amounts')
      } else {
        fail('T10-client-pdf', `hasPongs=${hasPongs} hasAmount=${hasAmount}`)
      }
      
      // TEST INTERNAL SHEET ────────────────────
      await page.goto(`${BASE}/quotes/${quoteId}/internal`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: '/tmp/07-internal.png' })
      const intContent = await page.locator('body').textContent()
      const hasInternal = intContent.includes('Driver') || intContent.includes('Fabric') || intContent.includes('Grand Total')
      if (hasInternal) {
        pass('T11-internal-sheet', 'Internal sheet renders with cost breakdown')
      } else {
        fail('T11-internal-sheet', `Content: ${intContent.substring(0, 200)}`)
      }
    }
  } else {
    fail('T8-save', 'Save button not found')
  }
  
  // TEST MARGIN ────────────────────────────────────
  // Start fresh quote
  await page.goto(`${BASE}/quotes/new`)
  await page.waitForTimeout(2000)
  
  // Fill client
  const ci2 = page.locator('input[placeholder*="client" i], input[placeholder*="Client"]').first()
  if (await ci2.count()) await ci2.fill('Margin Test')
  
  // Set dims - 1900 x 4150 mm (classic case where margin should move to cut axis)
  const ni2 = page.locator('input[type=number]')
  const nc2 = await ni2.count()
  // Fill first few
  for (let i = 0; i < Math.min(nc2, 5); i++) {
    const ph = await ni2.nth(i).getAttribute('placeholder').catch(() => '')
    console.log(`   ni2[${i}] ph="${ph}"`)
  }
  
  // Try dim inputs
  const d1in = page.locator('input[placeholder="3000"]')
  if (await d1in.count()) {
    await d1in.fill('1900')
  }
  const d2in = page.locator('input[placeholder="3000"]').nth(1)
  if (await d2in.count()) {
    await d2in.fill('4150')
  }
  await page.waitForTimeout(500)
  
  // Get fabric area before margin
  const prevBeforeMargin = await page.locator('[class*="indigo-50"]').first().textContent().catch(() => '')
  const areaBeforeMatch = prevBeforeMargin.match(/Fabric billed: ([\d.]+)/)
  info('fabric area before margin', areaBeforeMatch?.[1] ?? 'not found')
  
  // Find margin input
  const marginLabel = page.locator('label:has-text("Fabric Margin")')
  if (await marginLabel.count()) {
    const marginInput = page.locator('label:has-text("Fabric Margin")').locator('..').locator('input')
    await marginInput.fill('150')
    await marginInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    
    const prevAfterMargin = await page.locator('[class*="indigo-50"]').first().textContent().catch(() => '')
    const areaAfterMatch = prevAfterMargin.match(/Fabric billed: ([\d.]+)/)
    info('fabric area after 150mm margin', areaAfterMatch?.[1] ?? 'not found')
    
    if (areaBeforeMatch && areaAfterMatch && parseFloat(areaAfterMatch[1]) > parseFloat(areaBeforeMatch[1])) {
      pass('T4-margin', `Area ${areaBeforeMatch[1]} → ${areaAfterMatch[1]} sqm (increased by margin)`)
    } else {
      fail('T4-margin', `Before: ${areaBeforeMatch?.[1]}, After: ${areaAfterMatch?.[1]}`)
    }
  } else {
    fail('T4-margin', 'Fabric Margin label not found on page')
  }

  await browser.close()
  
  console.log('\n══ SUMMARY ══')
  R.forEach(r => console.log(`${r.s} ${r.t}`))
  const fails = R.filter(r => r.s === '❌').length
  console.log(`\n${fails === 0 ? 'ALL PASS' : `${fails} FAILED`} (${R.length} tests)`)
}

run().catch(e => { console.error('ERROR:', e); process.exit(1) })
