export const PROJECT_REPOSITORY='brunopike/pancake-depth-viewer';
// The GitHub rename preserves this repository; unrelated forks must not publish.
export function projectRepository(name){
  return name===PROJECT_REPOSITORY||name==='starkweng/pancake-depth-viewer'?PROJECT_REPOSITORY:null;
}
