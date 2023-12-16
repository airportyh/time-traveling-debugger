def average(numbers):
    sum = 0
    for num in numbers:
        sum += num
    average = sum / len(numbers)
    return average
average([4])
average([4, 5])
average([4, 5, 7])
average([4, 5, 7, 9])
average([1, 3, 5, 7, 9])
average([1, 3, 5, 7, 9, 4])
average([1, 3, 5, 7, 9, 4, 2])
average([1, 3, 5, 7, 9, 4, 8, 5])
average([1, 3, 5, 7, 9, 4, 8, 5, 0])
average([1, 3, 5, 7, 9, 4, 8, 5, 0, 6])