"""TOTW rating tests: browser fixtures only, no server writes."""
from playwright.sync_api import sync_playwright
URL = 'http://localhost:4200'
with sync_playwright() as p:
    for engine in ['chromium','webkit','firefox']:
        browser = getattr(p,engine).launch(**({'executable_path':'/usr/bin/google-chrome','args':['--no-sandbox']} if engine == 'chromium' else {}))
        context = browser.new_context(reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror',lambda e: errors.append(str(e)))
        mode = {'formation':'4-3-3','missing':False,'published':True}
        def fixture(route):
            response = route.fetch(); body = response.json(); state = body['json']
            players = state['squad'][:11]
            for player, position in zip(players,['DEF','MID','FWD','GK']): player['position'] = position
            records = [dict(playerId=v['id'],played=True,goals=0,assists=0,cleanSheets=1,yellowCards=0,redCards=0) for v in players]
            records[4]['redCards']=1
            records[5].update(played=False,cleanSheets=0)
            records[6]['goals']=3
            state['totw']=dict(week=2,formation=mode['formation'],published=mode['published'],playerIds=[v['id'] for v in players])
            state['weeklyRatings']=[dict(week=3,players=[])] + ([] if mode['missing'] else [dict(week=2,players=records)])
            route.fulfill(response=response,json=body)
        page.route('**/api/rpc/league/get*',fixture)
        for width in [320,390,820,1440]:
            page.set_viewport_size(dict(width=width,height=1000))
            for formation in ['4-3-3','4-4-2','3-5-2']:
                mode['formation']=formation
                page.goto(URL+'/totw'); page.locator('.pitch-rating-badge').first.wait_for()
                assert page.locator('.pitch-player').count()==11
                badges=page.locator('.pitch-rating-badge').all_text_contents()
                assert badges[:5]==['7.5','7.2','7.0','7.0','0.0'],badges
                assert page.locator('.pitch-not-rated').count()==1
                assert page.locator('.pitch-player').nth(6).locator('.pitch-rating-badge').inner_text()=='10.0'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(engine,width,formation)
                assert page.locator('.pitch-rating-badge').evaluate_all('(badges) => badges.every(b => {const r=b.getBoundingClientRect(),p=b.closest(".totw-pitch").getBoundingClientRect();return r.left>=p.left && r.right<=p.right})')
        mode['missing']=True
        page.goto(URL+'/totw'); page.locator('.pitch-not-rated').first.wait_for()
        assert page.locator('.pitch-rating-badge').count()==0
        assert page.locator('.pitch-not-rated').count()==11
        mode['published']=False
        page.goto(URL+'/totw'); page.locator('.pitch-player.unselected').first.wait_for()
        assert page.locator('.pitch-player.unselected').count()==11
        assert page.locator('.pitch-rating-badge,.pitch-not-rated').count()==0
        mode.update(missing=False,published=True,formation='4-3-3')
        page.goto(URL+'/totw'); page.locator('.pitch-rating-badge').first.wait_for()
        if engine=='chromium':
            page.locator('.totw-layout').screenshot(path='/home/user/master-league-totw-ratings.png')
        href=page.locator('a.pitch-player').first.get_attribute('href')
        page.locator('a.pitch-player').first.click(); page.wait_for_url(URL+href)
        assert not errors,errors
        print(f'PASS {engine}: three formations at four widths, matched week not latest, position bonuses, zero/no rating, missing week, unpublished XI and profile links')
        context.close();browser.close()