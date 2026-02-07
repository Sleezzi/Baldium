function MakeNumberMoreReadable(number: number) {
	return number > 9 ? number : `0${number}`;
}
export default MakeNumberMoreReadable;