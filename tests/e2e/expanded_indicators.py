"""E2E: expanded IBGE catalog — search, selection, narrative, single/compare, map tooltip, CSV, /dados, 390/430/1280."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/ibge'); OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  ctx=await b.new_context(viewport={'width':1280,'height':1800},accept_downloads=True)
  page=await ctx.new_page(); errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  reading=page.get_by_test_id('graph-reading')
  for w in [390,430,1280]:
   await page.set_viewport_size({'width':w,'height':1800})
   await page.goto('http://localhost:8080/laboratorio?x=idosos60',wait_until='domcontentloaded')
   await reading.filter(has_text='idosos').wait_for(timeout=90000)
   assert 'Censo Demográfico 2022' in await page.locator('body').inner_text()
   await page.get_by_role('button',name=re.compile(r'^X Idosos')).click()
   await page.get_by_role('status').filter(has_text='indicadores disponíveis').wait_for(timeout=30000)
   status=await page.get_by_role('status').filter(has_text='indicadores disponíveis').inner_text()
   assert re.search(r'8[0-9] indicadores disponíveis',status),status
   await page.get_by_label('Buscar indicador').fill('ESGOTO')  # accent/case-insensitive search
   await page.screenshot(path=str(OUT/f'picker-{w}.png'))
   await page.get_by_role('button',name=re.compile(r'^Esgoto por rede geral')).click()
   await reading.filter(has_text='esgoto').wait_for(timeout=90000)
   assert await page.get_by_role('button',name='Ver detalhes estatísticos').get_attribute('aria-expanded')=='false'
   assert '/x=esgoto' in page.url.replace('?','/').replace('&','/'),page.url
   await page.screenshot(path=str(OUT/f'lab-esgoto-{w}.png'))
   async with page.expect_download() as dl:
    await page.get_by_role('button',name='Exportar CSV (os dois)').click()
   d=await dl.value; assert 'esgoto' in d.suggested_filename,d.suggested_filename
   assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'overflow lab'
   # single mode 2022 + UF filter + PIB indicator (different source year)
   await page.goto('http://localhost:8080/laboratorio?ano=2022&turno=1&modo=lula&uf=BA&x=pibagro')
   await reading.wait_for(timeout=90000)
   body=await page.locator('body').inner_text()
   assert 'PIB dos Municípios 2021' in body and 'BA' in body
   txt=await reading.inner_text(); assert 'Lula' in txt and 'Flávio' not in txt, txt[:200]
   await page.screenshot(path=str(OUT/f'lab-pib-lula-{w}.png'))
   # Explore generic indicator map + tooltip
   await page.goto('http://localhost:8080/explorar?preset=indicator-map&ix=internet')
   await page.get_by_role('button',name=re.compile('Indicador: Domicílios com internet')).wait_for(timeout=60000)
   canvas=page.locator('canvas').first; await canvas.wait_for(timeout=90000); await page.wait_for_timeout(1500)
   box=await canvas.bounding_box(); await page.mouse.click(box['x']+box['width']*0.7,box['y']+box['height']*0.35)
   await page.wait_for_timeout(600)
   await page.screenshot(path=str(OUT/f'explore-internet-{w}.png'))
   await page.goto('http://localhost:8080/explorar?preset=elderly-map'); await page.get_by_text('Onde vivem mais idosos').wait_for(timeout=60000)
   await page.goto('http://localhost:8080/dados'); await page.get_by_text('Catálogo de indicadores municipais').wait_for(timeout=60000)
   await page.get_by_text(re.compile(r'^87 de 87 indicadores disponíveis no app')).wait_for(timeout=30000)
   await page.get_by_text('Saneamento',exact=True).click()
   assert await page.get_by_text('Não publicado para município').count()>=1
   await page.screenshot(path=str(OUT/f'dados-{w}.png'))
   assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'overflow dados'
   print('passed',w)
  assert not errors,errors
  await b.close()
asyncio.run(main())
