"""Read-only browser regression suite. Admin endpoints mocked; never publishes league data."""
import json
from playwright.sync_api import sync_playwright

URL = 'http://localhost:4200'
PATHS = ['/', '/teams', '/teams/seirin', '/standings', '/fixtures', '/news', '/transfers', '/stats', '/totw', '/notifications', '/admin']
SIZES = [(320,568), (390,844), (640,360), (768,1024), (820,1180), (1024,768), (1440,900)]

with sync_playwright() as p:
    for name in ['chromium', 'webkit', 'firefox']:
        browser = getattr(p,name).launch(**({'executable_path':'/usr/bin/google-chrome','args':['--no-sandbox']} if name == 'chromium' else {}))
        context = browser.new_context(reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for width,height in SIZES:
            page.set_viewport_size({'width':width,'height':height})
            for path in PATHS:
                page.goto(URL+path)
                page.wait_for_load_state('networkidle')
                assert page.locator('main').inner_text().strip(), (name,width,path,'empty')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (name,width,path,'overflow')
            page.locator('.notification-bell').click()
            assert page.locator('.notification-dropdown').is_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (name,width,'bell overflow')
            page.keyboard.press('Escape')
            assert page.locator('.notification-dropdown').count() == 0
            if width <= 700:
                page.get_by_role('button',name='Toggle navigation').click()
                page.get_by_role('link',name='Standings',exact=True).click()
                assert page.get_by_role('button',name='Toggle navigation').get_attribute('aria-expanded') == 'false'
        page.goto(URL+'/transfers')
        page.locator('.team-values-panel').first.wait_for()
        assert page.locator('.team-values-panel').count() == 4
        assert page.locator('.team-values-panel tbody tr').count() == 60
        page.goto(URL+'/teams/seirin')
        page.locator('.team-values-panel').wait_for()
        assert page.locator('.team-values-panel tbody tr').count() == 15
        profile = page.locator('.team-values-panel .player-table-name').first.get_attribute('href')
        page.goto(URL+profile)
        page.locator('.player-value-badge').wait_for()
        page.goto(URL+'/stats')
        page.locator('.performance-table tbody tr').first.wait_for()
        for tab in ['Yellow cards','Red cards']:
            page.get_by_role('button',name=tab,exact=True).click()
            assert page.locator('.performance-table tbody tr').count() == 60
        assert not errors,(name,errors)
        print(f'PASS {name}: 77 route/viewport checks, overlays, navigation, values, card tabs; no runtime errors', flush=True)
        context.close()

        # Recovery from failed reads, with a fresh cache.
        context = browser.new_context()
        page = context.new_page()
        page.route('**/api/rpc/league/get*', lambda route: route.fulfill(status=503, json={'message':'Temporary test outage'}))
        page.goto(URL+'/')
        page.get_by_role('heading',name='Unable to load the league').wait_for(timeout=15000)
        page.unroute('**/api/rpc/league/get*')
        page.get_by_role('button',name='Try again',exact=True).click()
        page.locator('.hero').wait_for()
        context.set_offline(True)
        page.locator('.connection-status').wait_for()
        context.set_offline(False)
        page.wait_for_function("!document.querySelector('.connection-status')")
        print(f'PASS {name}: network error/retry and offline/reconnect',flush=True)
        context.close()

        # Mock admin permission and save only, leaving the actual server protected.
        context = browser.new_context()
        page = context.new_page()
        page.route('**/api/rpc/league/access*', lambda route: route.fulfill(json={'json':{'allowed':True,'configured':True}}))
        saved = []
        def save_mock(route):
            payload = route.request.post_data_json
            data = payload.get('json',payload)
            saved.append(data)
            page.route('**/api/rpc/league/get*', lambda read: read.fulfill(json={'json':{**data,'photoUrls':{}}}))
            route.fulfill(json={'json':{**data,'notificationsCreated':0,'push':{'sent':0,'failed':0}}})
        page.route('**/api/rpc/league/save*',save_mock)
        page.goto(URL+'/admin')
        page.get_by_role('button',name='Players',exact=True).wait_for()
        page.get_by_role('button',name='Players',exact=True).click()
        values = page.get_by_role('spinbutton',name='Transfer value (SLE)',exact=True)
        assert values.count() == 15
        values.first.fill('12345')
        page.locator('.draft-warning').wait_for()
        # Trigger background data revalidation; the local draft must survive.
        other = context.new_page()
        other.goto(URL+'/')
        other.bring_to_front()
        page.bring_to_front()
        page.evaluate("window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange'))")
        page.wait_for_load_state('networkidle')
        assert values.first.input_value() == '12345'
        page.once('dialog',lambda dialog:dialog.dismiss())
        page.get_by_role('link',name='Back to the league',exact=False).click()
        assert '/admin' in page.url
        page.get_by_role('button',name='Save & publish',exact=True).click()
        page.get_by_text('All league updates are now published.',exact=False).wait_for()
        assert saved and saved[0]['squad'][0]['transferValue'] == 12345
        assert values.first.input_value() == '12345'
        page.get_by_role('combobox',name='Squad team').select_option('blue-lock')
        assert values.count() == 15
        print(f'PASS {name}: mock admin value edit/save, unsaved draft protection, leave confirmation, team selector',flush=True)
        context.close()
        browser.close()