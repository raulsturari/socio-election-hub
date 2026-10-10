import asyncio,re,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/scroll')
async def swipe(page,x,y,dy):
 session=await page.context.new_cdp_session(page)
 await session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,13):
  await session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+dy*i/12}]})
  await page.wait_for_timeout(25)
 await session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 await page.wait_for_timeout(400)
 await session.detach()
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  c=await b.new_context(viewport={'width':1280,'height':1800},has_touch=True,is_mobile=True)
  page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for width in [390,430]:
   await page.set_viewport_size({'width':width,'height':844})
   await page.goto('http://localhost:8080/explorar',wait_until='domcontentloaded')
   trigger=page.get_by_role('button',name=re.compile('Indicador:'))
   await trigger.wait_for(timeout=90000);await page.wait_for_timeout(10000);await trigger.scroll_into_view_if_needed();await page.wait_for_timeout(500)
   before=await page.evaluate('scrollY');await trigger.click();await page.wait_for_timeout(500);
   if not await page.get_by_role("dialog").count(): await trigger.click()
   dialog=page.get_by_role('dialog')
   await dialog.wait_for();await page.wait_for_timeout(700)
   assert await page.get_by_label('Buscar indicador').evaluate('(e)=>document.activeElement!==e')
   assert await dialog.evaluate('(e)=>!e.closest("main")')
   box=await dialog.bounding_box();assert box['y']>=0 and box['y']+box['height']<=845,box
   for d in await dialog.locator('details').all(): await d.evaluate('(e)=>e.open=true')
   area=page.get_by_test_id('sheet-scroll');ab=await area.bounding_box()
   await swipe(page,width/2,min(ab['y']+ab['height']-30,790),-280)
   assert await area.evaluate('(e)=>e.scrollTop')>100,'touch failed'
   assert abs(await page.evaluate('scrollY')-before)<2,'background moved'
   await area.evaluate('(e)=>e.scrollTop=e.scrollHeight');await page.wait_for_timeout(300)
   last=await dialog.locator('summary').last.bounding_box();assert last['y']<844,last
   await page.screenshot(path=str(OUT/f'picker-bottom-{width}.png'))
   await page.get_by_role('button',name='Fechar',exact=True).click();await page.wait_for_timeout(300)
   assert abs(await page.evaluate('scrollY')-before)<2,'position changed on close'
   await page.mouse.move(width/2,700);await page.mouse.wheel(0,600);await page.wait_for_timeout(400)
   assert await page.evaluate('scrollY')>before,'page remains locked'
   for route in ['/', '/comparar','/correlacoes','/laboratorio','/dados']:
    await page.goto('http://localhost:8080'+route,wait_until='domcontentloaded');await page.wait_for_timeout(1800)
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),route
    await page.mouse.move(width/2,600);await page.mouse.wheel(0,500);await page.wait_for_timeout(300)
    assert await page.evaluate('document.documentElement.scrollHeight<=innerHeight || scrollY>0'),route
   await page.goto('http://localhost:8080/laboratorio?uf=SP',wait_until='domcontentloaded')
   svg=page.get_by_role('img',name=re.compile('Dispersão')).first
   await svg.wait_for(timeout=90000);await svg.scroll_into_view_if_needed();await page.wait_for_timeout(500)
   sb=await svg.bounding_box();start=await page.evaluate('scrollY')
   await swipe(page,width/2,sb['y']+sb['height']*0.8,-150)
   assert await page.evaluate('scrollY')>start+40,'scatter blocks touch scroll'
   await page.get_by_role('button',name=re.compile('Filtros')).first.click()
   await page.get_by_role('dialog',name='Filtros').wait_for()
   await page.get_by_test_id('sheet-scroll').evaluate('(e)=>e.scrollTop=e.scrollHeight')
   await page.get_by_role('button',name='Ver resultados').click()
   assert not await page.get_by_role('dialog').count()
   await page.goto('http://localhost:8080/?uf=SP',wait_until='domcontentloaded')
   map=page.get_by_role('img',name=re.compile('Mapa municipal SP')).first
   await map.wait_for(timeout=90000);await map.scroll_into_view_if_needed();await page.wait_for_timeout(500)
   mb=await map.bounding_box();start=await page.evaluate('scrollY')
   await swipe(page,width/2,mb['y']+mb['height']*0.85,-180)
   assert await page.evaluate('scrollY')>start+40,'map blocks touch scroll'
   control=page.get_by_role('button',name='Mover e ampliar mapa').first
   await control.click();assert await page.get_by_role('button',name='Encerrar movimentação do mapa').first.get_attribute('aria-pressed')=='true'
   await page.get_by_role('button',name='Encerrar movimentação do mapa').first.click()
   await page.screenshot(path=str(OUT/f'page-scroll-{width}.png'))
   print('PASS',width,'sheet touch, background lock, close restoration, six routes scroll')
  assert not errors,errors
  await b.close()
asyncio.run(main())
