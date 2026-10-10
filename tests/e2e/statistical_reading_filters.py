import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/statistical-reading')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  c=await b.new_context(viewport={'width':1280,'height':1800},reduced_motion='reduce')
  page=await c.new_page()
  await page.set_viewport_size({'width':390,'height':1800})
  await page.goto('http://localhost:8080/laboratorio')
  await page.get_by_test_id('graph-reading').wait_for(timeout=90000)
  trigger=page.get_by_role('button',name='Ver detalhes estatísticos')
  await trigger.click()
  await page.get_by_role('button',name='Filtros').click()
  dialog=page.get_by_role('dialog',name='Filtros',exact=True)
  await dialog.get_by_role('button',name='2022',exact=True).click()
  await dialog.get_by_role('button',name='SP',exact=True).click()
  await dialog.get_by_role('button',name='Ver resultados').click()
  await page.get_by_test_id('graph-reading').filter(has_text='Jair Bolsonaro').wait_for(timeout=90000)
  assert 'SP' in await page.get_by_test_id('graph-reading').inner_text()
  assert await trigger.get_attribute('aria-expanded')=='false'
  await trigger.click()
  await page.get_by_role('radio',name='Lula',exact=True).click()
  await page.get_by_test_id('graph-reading').wait_for(timeout=90000)
  assert 'Jair Bolsonaro.' not in await page.get_by_test_id('graph-reading').inner_text()
  assert await trigger.get_attribute('aria-expanded')=='false'
  await page.get_by_test_id('graph-reading').screenshot(path=str(OUT/'reading-single-reduced-motion.png'))
  await trigger.click()
  assert await page.get_by_text('Pearson r',exact=True).count()==1
  await page.get_by_text('Diagnósticos',exact=True).scroll_into_view_if_needed()
  await page.screenshot(path=str(OUT/'technical-content-visible.png'))
  assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  print('Year/UF/mode changes close details; single statistics and reduced motion passed')
  await b.close()
asyncio.run(main())
