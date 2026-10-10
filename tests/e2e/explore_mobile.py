"""Real backend mobile E2E. Run: python3 tests/e2e/explore_mobile.py. Artifacts stay in /tmp/browser."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright, expect
OUT=Path('/tmp/browser/explore-e2e');OUT.mkdir(parents=True,exist_ok=True)
async def ready(page):
 await page.locator('[aria-busy="false"]').wait_for(timeout=90000)
 await page.wait_for_timeout(1500)
 assert await page.get_by_role('alert').count()==0
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800})
  page=await context.new_page();await page.set_viewport_size({'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080/explorar',wait_until='domcontentloaded');await ready(page)
  await expect(page.get_by_label('Ano eleitoral')).to_have_value('1')
  await expect(page.get_by_label('Turno',exact=True)).to_have_value('1')
  await page.screenshot(path=str(OUT/'01-default.png'))
  canvas=page.get_by_role('img',name='Mapa municipal interativo');await canvas.scroll_into_view_if_needed()
  before=await canvas.screenshot()
  await canvas.click(position={'x':190,'y':250});await expect(page.get_by_role('status').first).to_contain_text('·')
  await page.get_by_role('status').first.scroll_into_view_if_needed()
  await page.screenshot(path=str(OUT/'02-map-tooltip.png'))
  await page.get_by_role('radio',name='Lula',exact=True).click();await ready(page)
  assert before!=await canvas.screenshot()
  before_year=await canvas.screenshot()
  await page.get_by_label('Ano eleitoral').fill('0');await ready(page)
  assert 'ano=2022' in page.url
  assert before_year!=await canvas.screenshot()
  await page.get_by_label('Ano eleitoral').fill('1');await ready(page)
  await page.get_by_role('button',name='Galeria de análises').click()
  await page.get_by_role('button',name='Renda × percentual de votos',exact=False).click();await ready(page)
  await expect(page.get_by_role('heading',name='Renda e votação',exact=True)).to_be_visible()
  scatter=page.get_by_role('img',name='Dispersão municipal interativa');await scatter.scroll_into_view_if_needed();await scatter.click(position={'x':90,'y':180})
  await expect(page.get_by_role('status').first).to_contain_text('·')
  await page.get_by_role('status').first.scroll_into_view_if_needed()
  await page.screenshot(path=str(OUT/'03-scatter.png'))
  await page.get_by_role('button',name='Iniciar tour').click();await page.wait_for_timeout(1700)
  assert int(await page.get_by_role('progressbar').get_attribute('aria-valuenow'))>0
  await page.wait_for_timeout(4300);assert 'education-scatter' in page.url
  await page.get_by_role('button',name='Pausar tour').click();paused=page.url;await page.wait_for_timeout(5300);assert page.url==paused
  await page.get_by_role('button',name='Repetir animação').click()
  await page.wait_for_timeout(1400)
  # Horizontal pointer swipe changes preset, vertical scroll remains native.
  region=page.get_by_role('region',name='Análises oficiais');await region.scroll_into_view_if_needed();rect=await region.bounding_box()
  await page.mouse.move(310,rect['y']+100);await page.mouse.down();await page.mouse.move(90,rect['y']+105,steps=6);await page.mouse.up();assert 'religion-scatter' in page.url
  ids=['vote-map','abstention-map','income-map','education-map','religion-map','vote-change','income-scatter','education-scatter','religion-scatter','urban-scatter','vote-ranking','turnout-ranking','income-bands','states']
  results=[]
  for preset in ids:
   await page.goto('http://localhost:8080/explorar?ano=2026&turno=1&cand=13&preset='+preset,wait_until='domcontentloaded');await ready(page)
   assert await page.get_by_role('img').count()>0,preset
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),preset
   results.append({'preset':preset,'loaded':True})
   if preset in ['vote-ranking','income-bands','states']:await page.screenshot(path=str(OUT/(preset+'.png')))
  await page.get_by_role('link',name='Atlas',exact=True).click();assert 'cand=13' in page.url and 'ano=2026' in page.url
  await page.goto('http://localhost:8080/explorar?ano=2022&turno=2&cand=13');await ready(page);await expect(page.get_by_label('Ano eleitoral')).to_have_value('0');await expect(page.get_by_label('Turno',exact=True)).to_have_value('2')
  await page.emulate_media(reduced_motion='reduce');await expect(page.get_by_role('button',name='Iniciar tour')).to_be_disabled()
  assert not errors,errors
  print(json.dumps({'presets':results,'mobile_width':390,'errors':errors,'checks':['default','map tooltip','candidate visual change','year','gallery','scatter tooltip','play progress','auto advance','pause','replay','swipe','navigation preservation','explicit history','reduced motion']},ensure_ascii=False))
  await browser.close()
asyncio.run(main())
