"""Real-data geometry reading regression, including render-domain diagnostics."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/tmp/browser/integrated-reading-regression')

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 1800}, accept_downloads=True)
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for width in [390, 430]:
            await page.set_viewport_size({'width': width, 'height': 1800})
            for variable in ['renda', 'preta', 'superior']:
                await page.goto(f'http://localhost:8080/laboratorio?x={variable}', wait_until='domcontentloaded')
                reading = page.get_by_test_id('graph-reading')
                await reading.wait_for(timeout=90000)
                assert await reading.count() == 1
                assert await reading.locator('p[data-series]').count() == 0
                assert await page.get_by_text('Pearson r', exact=True).count() == 0
                trigger = page.get_by_role('button', name='Ver detalhes estatísticos')
                assert await trigger.get_attribute('aria-expanded') == 'false'
                await page.get_by_role('img', name='Dispersão', exact=False).scroll_into_view_if_needed()
                await page.screenshot(path=str(OUT / f'{variable}-{width}-closed.png'))
                await trigger.click()
                assert await page.get_by_role('region', name='Diagnóstico do desenho').count() == 1
                await page.get_by_text('Desenho e escala exibida', exact=True).wait_for()
                assert await page.get_by_text('Pearson r', exact=True).count() == 2
                await trigger.scroll_into_view_if_needed()
                await page.screenshot(path=str(OUT / f'{variable}-{width}-open.png'))
                await trigger.focus()
                await page.keyboard.press('Enter')
                assert await trigger.get_attribute('aria-expanded') == 'false'
                assert await page.get_by_role('region', name='Diagnóstico do desenho').count() == 0
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if variable == 'preta':
                    async with page.expect_download() as download:
                        await page.get_by_role('button', name='Exportar CSV (os dois)').click()
                    await (await download.value).save_as(OUT / f'preta-{width}.csv')
            await page.goto('http://localhost:8080/correlacoes?modo=comparar')
            await page.get_by_test_id('graph-reading').wait_for(timeout=90000)
            assert await page.get_by_text('Pearson r', exact=True).count() == 0
            await page.goto('http://localhost:8080/laboratorio?ano=2022&uf=SP&modo=bolsonaro&x=renda')
            await page.get_by_test_id('graph-reading').filter(has_text='Jair Bolsonaro').wait_for(timeout=90000)
            await page.get_by_role('button', name='Ver detalhes estatísticos').click()
            assert await page.get_by_text('Pearson r', exact=True).count() == 1
        assert not errors, errors
        print('Integrated reading, geometry details, CSV and mobile widths passed.')
        await browser.close()

asyncio.run(main())