import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/statistical-reading')
OUT.mkdir(parents=True, exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800},accept_downloads=True)
  page=await context.new_page()
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  for width in [390,430]:
   await page.set_viewport_size({'width':width,'height':1800})
   await page.goto('http://localhost:8080/laboratorio',wait_until='domcontentloaded')
   await page.get_by_test_id('graph-reading').wait_for(timeout=90000)
   trigger=page.get_by_role('button',name='Ver detalhes estatísticos')
   assert await trigger.get_attribute('aria-expanded')=='false'
   assert await page.get_by_text('Pearson r',exact=True).count()==0
   await page.screenshot(path=str(OUT/f'lab-closed-{width}.png'))
   await trigger.click()
   assert await page.get_by_text('Pearson r',exact=True).count()==2
   assert await page.get_by_text('Diagnósticos',exact=True).count()==2
   await trigger.scroll_into_view_if_needed()
   await page.screenshot(path=str(OUT/f'lab-open-{width}.png'))
   await trigger.focus(); await page.keyboard.press('Enter')
   assert await trigger.get_attribute('aria-expanded')=='false'
   await page.keyboard.press('Space')
   assert await trigger.get_attribute('aria-expanded')=='true'
   async with page.expect_download() as dl:
    await page.get_by_role('button',name='Exportar CSV (os dois)').click()
   download=await dl.value
   await download.save_as(OUT/f'lab-{width}.csv')
   print('CSV',width,download.suggested_filename)
   # Variable selection through the actual sheet
   await page.get_by_role('button',name='X Renda domiciliar per capita').click()
   await page.get_by_role('button',name='Cor ou raça preta',exact=True).click()
   await page.get_by_test_id('graph-reading').filter(has_text='cor ou raça preta').wait_for(timeout=90000)
   assert await trigger.get_attribute('aria-expanded')=='false'
   assert 'sem incluir a categoria parda' in await page.get_by_test_id('graph-reading').inner_text()
   await trigger.click()
   await page.get_by_role('button',name='X Cor ou raça preta').click()
   await page.get_by_role('button',name='Superior completo (25+)',exact=True).click()
   await page.get_by_test_id('graph-reading').filter(has_text='25 anos').wait_for(timeout=90000)
   assert await trigger.get_attribute('aria-expanded')=='false'
   assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
   print('LAB variable/accordion/keyboard/overflow passed',width)
   await page.goto('http://localhost:8080/laboratorio?ano=2022&turno=1&modo=bolsonaro&uf=SP&x=renda')
   await page.get_by_test_id('graph-reading').filter(has_text='Jair Bolsonaro').wait_for(timeout=90000)
   text=await page.get_by_test_id('graph-reading').inner_text()
   assert '2022' in await page.locator('body').inner_text() and 'SP' in await page.locator('body').inner_text() and 'Lula.' not in text
   assert await trigger.get_attribute('aria-expanded')=='false'
   await page.goto('http://localhost:8080/correlacoes')
   await page.get_by_test_id('graph-reading').wait_for(timeout=90000)
   assert await page.get_by_text('Pearson r',exact=True).count()==0
   await page.screenshot(path=str(OUT/f'corr-closed-{width}.png'))
   await trigger.click()
   assert await page.get_by_text('Pearson r',exact=True).count()==2
   await page.screenshot(path=str(OUT/f'corr-open-{width}.png'))
   assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
   print('CORR passed',width)
  print('PAGE ERRORS',json.dumps(errors))
  assert not errors
  await browser.close()
asyncio.run(main())
