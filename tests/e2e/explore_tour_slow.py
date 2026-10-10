"""Slow network: tour must not change preset until current analysis is fully ready + selected duration."""
import asyncio, time, json
from pathlib import Path
from playwright.async_api import async_playwright, expect
OUT=Path('/tmp/browser/tour');OUT.mkdir(parents=True,exist_ok=True)
DELAY=7.0
async def run(width):
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);ctx=await b.new_context(viewport={'width':width,'height':1800});pg=await ctx.new_page()
  errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  async def slow(route):
   await asyncio.sleep(DELAY);await route.continue_()
  await pg.goto('http://localhost:8080/explorar',wait_until='networkidle')
  sel=pg.locator('select[aria-label="Tempo por gráfico"]');await expect(sel).to_have_value('15',timeout=20000)
  await sel.select_option('5')
  await pg.reload(wait_until='domcontentloaded');await expect(pg.locator('select[aria-label="Tempo por gráfico"]')).to_have_value('5',timeout=20000)  # persisted
  await ctx.route('**/_serverFn/**',slow)
  state=pg.get_by_test_id('tour-state')
  await pg.get_by_role('button',name='Iniciar tour').click()
  log=[];ready_at=None;url=pg.url;t0=time.monotonic()
  while time.monotonic()-t0<70 and len(log)<3:
   s,pv=await pg.evaluate("[document.querySelector('[data-testid=tour-state]').textContent,Number(document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'))]");now=time.monotonic()
   if s=='Exibindo' and ready_at is None: ready_at=now
   if s!='Exibindo': 
    if s.startswith('Carregando'): assert pv==0,(s,pv)
   if pg.url!=url:
    assert ready_at is not None,'advanced before ready'
    shown=now-ready_at;log.append({'from':url.split('preset=')[-1] if 'preset=' in url else 'vote-map','after_ready_s':round(shown,2)})
    assert shown>=4.8,f'advanced after only {shown:.2f}s'
    url=pg.url;ready_at=None
   await asyncio.sleep(0.1)
  assert len(log)>=2,log
  await pg.screenshot(path=str(OUT/f'loading-{width}.png'))
  # pause stops advancing
  await pg.get_by_role('button',name='Pausar tour').click();u=pg.url;await asyncio.sleep(14);assert pg.url==u
  # touching the chart pauses
  await ctx.unroute('**/_serverFn/**')
  await pg.get_by_role('button',name='Iniciar tour').click();await asyncio.sleep(0.5)
  await pg.get_by_role('region',name='Análises oficiais').click(position={'x':150,'y':300})
  await expect(pg.get_by_role('button',name='Iniciar tour')).to_be_visible()
  assert not await pg.evaluate('document.documentElement.scrollWidth>innerWidth')
  await pg.screenshot(path=str(OUT/f'final-{width}.png'))
  print(json.dumps({'width':width,'delay_s':DELAY,'advances':log,'errors':errors}))
  assert not errors
  await b.close()
async def main():
 for w in (390,430): await run(w)
asyncio.run(main())
