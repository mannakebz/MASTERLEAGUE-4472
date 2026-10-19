"""Read-only weekly UI tests. Admin access/save mocked; never publishes server data."""
from playwright.sync_api import sync_playwright
URL = 'http://localhost:4200'

with sync_playwright() as p:
    for engine in ['chromium', 'webkit', 'firefox']:
        browser = getattr(p, engine).launch(**({'executable_path':'/usr/bin/google-chrome','args':['--no-sandbox']} if engine == 'chromium' else {}))
        context = browser.new_context(reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        section = page.locator('.player-ratings-section')
        section.wait_for()
        assert section.locator('.weekly-player-card').count() == 60
        assert section.locator('table').count() == 0
        if page.get_by_label('Ratings week').is_disabled():
            assert section.locator('.weekly-rating-badge').count() == 0
            assert 'No weekly performances published yet' in section.inner_text()
        context.close()

        context = browser.new_context(reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        data = {}
        def sample(route):
            response = route.fetch()
            body = response.json()
            state = body['json']
            # Ensure all position categories exist in the browser fixture only.
            state['squad'][0]['position'] = 'FWD'
            state['squad'][1]['position'] = 'DEF'
            state['squad'][4]['position'] = 'MID'
            state['squad'][5]['position'] = 'GK'
            records = []
            for player in state['squad']:
                record = dict(playerId=player['id'], played=True, goals=0, assists=0, cleanSheets=0, yellowCards=0, redCards=0)
                if player['position'] == 'DEF': record['cleanSheets'] = 1
                records.append(record)
            records[0]['goals'] = 1
            records[2]['redCards'] = 1
            records[3]['played'] = False
            records[3]['cleanSheets'] = 0
            state['weeklyRatings'] = [dict(week=1, players=[]), dict(week=2, players=records)]
            data.update(state)
            route.fulfill(response=response, json=body)
        page.route('**/api/rpc/league/get*', sample)
        for width in [320,390,820,1440]:
            page.set_viewport_size(dict(width=width,height=900))
            page.goto(URL)
            section = page.locator('.player-ratings-section'); section.wait_for()
            assert page.get_by_label('Ratings week').input_value() == '2'
            assert section.locator('.weekly-team-panel').count() == 4
            assert section.locator('.weekly-player-card').count() == 60
            assert section.locator('.weekly-rating-badge').count() == 59
            assert section.locator('.weekly-player-card').nth(0).locator('.weekly-rating-badge').inner_text() == '7.5'
            assert section.locator('.weekly-player-card').nth(1).locator('.weekly-rating-badge').inner_text() == '7.5'
            assert section.locator('.weekly-player-card').nth(2).locator('.weekly-rating-badge').inner_text() == '0.0'
            assert section.locator('.weekly-player-card').nth(3).locator('.weekly-rating-badge').count() == 0
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (engine,width)
            selector = section.get_by_label('Player ratings team')
            for team in data['teams']:
                selector.select_option(team['id'])
                assert section.locator('.weekly-player-card').count() == 15
            selector.select_option('all')
            page.get_by_label('Ratings week').select_option('1')
            assert section.locator('.weekly-rating-badge').count() == 0
            page.get_by_label('Ratings week').select_option('2')
            href = section.locator('.weekly-player-card').first.get_attribute('href')
            section.locator('.weekly-player-card').first.click(); page.wait_for_url(URL+href)
        page.goto(URL+'/?ratingWeek=1')
        page.locator('.player-ratings-section').wait_for()
        assert page.get_by_label('Ratings week').input_value() == '1'
        context.close()

        context = browser.new_context(reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/api/rpc/league/access*',lambda r:r.fulfill(json={'json':{'allowed':True,'configured':True}}))
        page.route('**/api/rpc/league/get*',lambda r:r.fulfill(json={'json':data}))
        saves = []
        def save_mock(route):
            value = route.request.post_data_json['json']
            saves.append(value)
            data.update(value)
            route.fulfill(json={'json':{**value,'notificationsCreated':1,'push':{'sent':0,'failed':0}}})
        page.route('**/api/rpc/league/save*', save_mock)
        page.goto(URL+'/admin')
        page.get_by_role('button',name='Weekly ratings',exact=True).click()
        assert page.locator('.weekly-admin-row').count() == 15
        page.get_by_label('New ratings week number').fill('3')
        page.get_by_role('button',name='Add week',exact=True).click()
        assert page.get_by_label('Edit ratings week').input_value() == '3'
        # All four position categories expose clean sheets and the right live bonus.
        for position, expected in [('DEF','7.5'), ('MID','7.2'), ('FWD','7.0'), ('GK','7.0')]:
            player = next(v for v in data['squad'] if v['position'] == position)
            page.get_by_label('Weekly ratings team').select_option(player['teamId'])
            player_name = player['name']
            target = page.locator('.weekly-admin-row').filter(has=page.get_by_label(player_name+' played',exact=True))
            page.get_by_label(player_name+' played',exact=True).check()
            page.get_by_label(player_name+' weekly clean sheets',exact=True).fill('1')
            assert target.locator('.weekly-rating-preview').inner_text() == expected
            page.get_by_label(player_name+' played',exact=True).uncheck()
        page.get_by_label('Weekly ratings team').select_option(data['teams'][0]['id'])
        defender = next(v for v in data['squad'] if v['teamId'] == data['teams'][0]['id'] and v['position'] == 'DEF')
        name = defender['name']
        row = page.locator('.weekly-admin-row').filter(has=page.get_by_label(name+' played',exact=True))
        page.get_by_label(name+' played',exact=True).check()
        assert row.locator('.weekly-rating-preview').inner_text() == '6.0'
        page.get_by_label(name+' weekly clean sheets',exact=True).fill('1')
        assert row.locator('.weekly-rating-preview').inner_text() == '7.5'
        page.get_by_label(name+' weekly assists',exact=True).fill('1')
        assert row.locator('.weekly-rating-preview').inner_text() == '8.4'
        page.get_by_label(name+' weekly yellow cards',exact=True).fill('1')
        assert row.locator('.weekly-rating-preview').inner_text() == '7.9'
        page.get_by_label(name+' weekly red cards',exact=True).fill('1')
        assert row.locator('.weekly-rating-preview').inner_text() == '0.0'
        page.get_by_label(name+' played',exact=True).uncheck()
        assert row.locator('.weekly-rating-preview').inner_text() == 'Not rated'
        assert page.get_by_label(name+' weekly clean sheets',exact=True).input_value() == '0'
        page.get_by_label(name+' played',exact=True).check()
        page.get_by_label(name+' weekly clean sheets',exact=True).fill('1')
        for width in [320,390,820,1440]:
            page.set_viewport_size(dict(width=width,height=900))
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (engine,width,'admin overflow')
        for team in data['teams']:
            page.get_by_label('Weekly ratings team').select_option(team['id'])
            assert page.locator('.weekly-admin-row').count() == 15
        original_squad = data['squad']
        page.get_by_role('button',name='Save & publish',exact=True).click()
        page.get_by_text('All league updates are now published.',exact=False).wait_for()
        assert len(saves) == 1
        assert saves[0]['squad'] == original_squad
        assert [w['week'] for w in saves[0]['weeklyRatings']] == [1,2,3]
        page.goto(URL)
        page.locator('.player-ratings-section').wait_for()
        assert page.get_by_label('Ratings week').input_value() == '3'
        assert page.locator('.weekly-rating-badge').all_text_contents() == ['7.5']
        assert not errors, (engine,errors)
        print(f'PASS {engine}: 4 widths, team/week selectors, 60 cards, clean sheet/red/no-play badges, links; mock admin edit/preview/clear/publish, history and season preservation')
        if engine == 'chromium':
            page.evaluate("scrollTo(0,document.querySelector('.player-ratings-section').getBoundingClientRect().top+scrollY-110)")
            page.screenshot(path='/home/user/master-league-weekly-desktop.png')
            page.set_viewport_size(dict(width=390,height=844))
            page.evaluate("scrollTo(0,document.querySelector('.player-ratings-section').getBoundingClientRect().top+scrollY-110)")
            page.screenshot(path='/home/user/master-league-weekly-mobile.png')
        context.close(); browser.close()