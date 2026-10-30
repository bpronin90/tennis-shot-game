"""Browser smoke test. Run against an already running Vite or preview server.

Requires Python Playwright and Chromium; no app hooks or direct state edits are used.
Usage: python3 tests/browser_smoke.py [http://127.0.0.1:5173] [artifact-directory]
"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173'
ARTIFACTS = Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/tennis-validation')
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def click_target(page, x, y, touch=False):
    page.locator('.court-svg').scroll_into_view_if_needed()
    pos = page.locator('.court-svg').evaluate('''(svg, coords) => {
        const point = svg.createSVGPoint();
        point.x = 112.37 + coords.x * 2.5526;
        point.y = 5.24 + coords.y * 6.0952;
        const result = point.matrixTransform(svg.getScreenCTM());
        return {x: result.x, y: result.y};
    }''', {'x': x, 'y': y})
    if touch:
        page.touchscreen.tap(pos['x'], pos['y'])
    else:
        page.mouse.click(pos['x'], pos['y'])


def settle(page):
    page.clock.run_for(4000)


def ready_for_shot(page):
    # Automatic serves can produce a legitimate opponent error before any input.
    for _ in range(15):
        if 'Your shot.' in page.locator('.court-status').inner_text():
            return
        next_button = page.get_by_role('button', name='Next point', exact=True)
        if next_button.count():
            next_button.click()
        settle(page)
    raise AssertionError('No playable return after automatic serves')


def opponent_x(page):
    return page.locator('.court-svg circle[fill="#f4ac84"]').evaluate('''node => {
        const transform = node.parentElement.transform.baseVal.getItem(0).matrix;
        return (transform.e - 112.37) / 2.5526;
    }''')


def play_until(page, finished, max_shots=150, touch=False):
    shots, points = 0, 0
    for _ in range(max_shots * 3):
        if finished():
            return {'shots': shots, 'points': points}
        if page.locator('.result-card').count():
            if page.get_by_role('button', name='Next point', exact=True).count():
                page.get_by_role('button', name='Next point', exact=True).click()
                points += 1
            else:
                raise AssertionError('Unexpected terminal result: ' + page.locator('.result-card').inner_text())
        elif 'Your shot.' in page.locator('.court-status').inner_text():
            shots += 1
            assert shots <= max_shots, 'Too many shots without finishing'
            page.locator('.shot-button').nth(0 if shots % 2 else 1).click()
            click_target(page, 20 if opponent_x(page) > 50 else 80, 18, touch)
        settle(page)
    raise AssertionError('Game did not advance to the requested outcome')


def run():
    report = {'checks': [], 'errors': [], 'challenges': []}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        context.add_init_script('Date.now = () => 12345')
        page = context.new_page()
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.clock.install()
        page.goto(BASE)
        settle(page)
        ready_for_shot(page)

        expect(page.locator('.tutorial-card')).to_be_visible()
        page.locator('.shot-button').nth(0).click()
        expect(page.locator('.tutorial-card')).to_contain_text('2 / 3')
        click_target(page, 80, 18)
        expect(page.locator('.tutorial-card')).to_contain_text('3 / 3')
        page.get_by_role('button', name='Let’s play').click()
        expect(page.locator('.tutorial-card')).to_have_count(0)
        report['checks'].append('First-launch interactive tutorial: select shot, target court, finish')
        settle(page)

        for i, name in enumerate(['Normal', 'Power', 'Slice']):
            page.locator('.shot-button').nth(i).click()
            expect(page.locator('.shot-button').nth(i)).to_have_attribute('aria-pressed', 'true')
        report['checks'].append('All three shot controls select and display their state')

        page.get_by_role('button', name='Restart', exact=True).click()
        expect(page.locator('.score-numbers')).to_have_attribute('aria-label', 'Score: You 0, opponent 0')
        settle(page)
        page.screenshot(path=str(ARTIFACTS / 'desktop.png'), full_page=True)
        match = play_until(page, lambda: page.locator('.result-eyebrow').filter(has_text='MATCH COMPLETE').count() > 0)
        nums = list(map(int, re.findall(r'\d+', page.locator('.score-numbers').get_attribute('aria-label'))))
        assert max(nums) >= 7 and abs(nums[0] - nums[1]) >= 2
        report['checks'].append({'complete_match': match, 'score': nums})

        page.get_by_role('button', name='Back to clubhouse').click()
        expect(page.get_by_role('dialog')).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile('Practice Court')).click()
        expect(page.locator('.match-meta')).to_have_text('FREE PLAY')
        assert page.locator('.score-numbers').count() == 0
        practice = play_until(page, lambda: page.locator('.result-card').count() > 0)
        page.get_by_role('button', name='Next point', exact=True).click()
        settle(page)
        assert page.locator('.score-numbers').count() == 0
        report['checks'].append({'practice_point_and_continue_without_score': practice})

        for i, name in enumerate(['Rookie', 'Club Player', 'Pro']):
            page.locator('.difficulty-button').nth(i).click()
            expect(page.locator('.difficulty-button').nth(i)).to_have_attribute('aria-pressed', 'true')
            expect(page.locator('.score-side.opponent')).to_contain_text(name)
            settle(page)
            assert 'Your shot.' in page.locator('.court-status').inner_text() or page.locator('.result-card').count()
        report['checks'].append('All difficulties start and display the selected opponent')
        page.locator('.difficulty-button').nth(0).click()

        page.get_by_role('navigation', name='Game modes').get_by_role('button', name=re.compile('Challenges')).click()
        for challenge in range(5):
            page.locator('.challenge-button').nth(challenge).click()
            expect(page.get_by_role('progressbar')).to_have_attribute('value', '0')
            settle(page)
            outcome = play_until(page, lambda: page.locator('.result-eyebrow').filter(has_text='CHALLENGE COMPLETE').count() > 0)
            progress = page.get_by_role('progressbar')
            assert progress.get_attribute('value') == progress.get_attribute('max')
            report['challenges'].append({'challenge': challenge + 1, **outcome})
            page.get_by_role('button', name='Retry this challenge').click()
            expect(page.get_by_role('progressbar')).to_have_attribute('value', '0')
        report['checks'].append('All five challenges completed through clicks, then reset to zero')
        page.get_by_role('button', name='How to play', exact=True).last.click()
        expect(page.locator('.tutorial-card')).to_be_visible()
        page.get_by_role('button', name='Skip tutorial').click()
        report['checks'].append('Help replays tutorial')

        for width in [768, 390, 320]:
            mobile = browser.new_context(viewport={'width': width, 'height': 844}, is_mobile=True, has_touch=True)
            mobile.add_init_script('localStorage.setItem("tsl-tutorial", "true"); Date.now = () => 12345')
            m = mobile.new_page()
            m.on('pageerror', lambda error: report['errors'].append(str(error)))
            m.clock.install()
            m.goto(BASE)
            settle(m)
            ready_for_shot(m)
            metrics = m.evaluate('({width: innerWidth, document: document.documentElement.scrollWidth})')
            assert metrics['document'] <= metrics['width'], f'Horizontal overflow at {width}: {metrics}'
            m.locator('.shot-button').nth(2).tap()
            expect(m.locator('.shot-button').nth(2)).to_have_attribute('aria-pressed', 'true')
            click_target(m, 78, 18, touch=True)
            assert 'Your shot.' not in m.locator('.court-status').inner_text()
            settle(m)
            m.screenshot(path=str(ARTIFACTS / f'mobile-{width}.png'), full_page=True)
            m.get_by_role('button', name='Main menu', exact=True).first.tap()
            expect(m.get_by_role('dialog')).to_be_visible()
            m.get_by_role('dialog').get_by_role('button', name=re.compile('Practice Court')).tap()
            expect(m.locator('.match-meta')).to_have_text('FREE PLAY')
            report['checks'].append(f'{width}px: no overflow; touch shot selection, target, menu, practice')
            mobile.close()
        assert not report['errors'], report['errors']
        browser.close()
    (ARTIFACTS / 'report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    run()
