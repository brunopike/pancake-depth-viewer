import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_REPOSITORY,projectRepository} from '../server/esim/repository.mjs';

test('the renamed repository and its legacy alias publish to the same canonical repository',()=>{
  assert.equal(projectRepository('brunopike/pancake-depth-viewer'),PROJECT_REPOSITORY);
  assert.equal(projectRepository('starkweng/pancake-depth-viewer'),PROJECT_REPOSITORY);
  for(const fork of ['other/pancake-depth-viewer','brunopike/other',undefined,''])assert.equal(projectRepository(fork),null);
});
