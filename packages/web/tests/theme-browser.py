"""Theme regression: browser storage only, public reads, no owner data writes."""
from playwright.sync_api import sync_playwright

URL = 'http://localhost:4200'
paths = ['/', '/teams', '/teams/seirin', '/standings', '/fixtures', '/news', '/transfers', '/stats', '/totw', '/notifications', '/admin']
with sync_playwright() as p:
    for engine in ['chromium', 'webkit', 'firefox']:
        browser = getattr(p, engine).launch(**({'executable_path': '/usr/bin/google-chrome', 'args': ['--no-sandbox']} if engine == 'chromium' else {}))
        context = browser.new_context(reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        assert page.get_by_role('button', name='Switch to dark mode').count() == 1
        assert page.locator('h1').first.evaluate('(e) => getComputedStyle(e).fontFamily.includes("Poppins") && getComputedStyle(e).fontWeight === "700"')
        assert page.locator('.hero-text p').first.evaluate('(e) => getComputedStyle(e).fontFamily.includes("Poppins") && +getComputedStyle(e).fontWeight < 700')
        page.get_by_role('button', name='Switch to dark mode').click()
        assert page.evaluate('document.documentElement.dataset.theme') == 'dark'
        assert page.evaluate('localStorage.getItem("master-league-theme")') == 'dark'
        for width, height in [(320,568),(390,844),(640,360),(820,1180),(1440,900)]:
            page.set_viewport_size(dict(width=width,height=height))
            for path in paths:
                page.goto(URL+path); page.wait_for_load_state('networkidle')
                assert page.evaluate('document.documentElement.dataset.theme') == 'dark'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (engine,width,path,'overflow')
                assert page.locator('main').inner_text().strip(), (engine,width,path,'empty')
                assert page.locator('h1').first.evaluate('(e) => getComputedStyle(e).fontFamily.includes("Poppins") && getComputedStyle(e).fontWeight === "700"'), (engine,width,path,'font')
                assert page.get_by_role('button', name='Switch to light mode').is_visible()
            if width <= 700:
                page.get_by_role('button',name='Toggle navigation').click()
                assert page.get_by_role('link',name='Overview',exact=True).is_visible()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                page.keyboard.press('Escape')
        page.goto(URL+'/notifications')
        assert page.locator('.push-opt-in').evaluate('(e) => getComputedStyle(e).backgroundImage.includes("gradient")')
        page.get_by_role('button',name='Switch to light mode').click()
        assert page.evaluate('document.documentElement.dataset.theme')=='light'
        assert page.evaluate('localStorage.getItem("master-league-theme")')=='light'
        page.goto(URL+'/admin')
        page.get_by_role('button',name='Switch to dark mode').wait_for()
        assert page.get_by_role('button',name='Switch to dark mode').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors, (engine,errors)
        print(f'PASS {engine}: 55 dark route/viewport checks, 320px header, toggle/persistence, Poppins weights, light restore; no runtime errors')
        context.close(); browser.close()