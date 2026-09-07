import Foundation
import Vision
import CoreImage
import CoreVideo

let args = CommandLine.arguments
guard args.count >= 3, let input = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("usage: cutout <input> <output.png>\n".data(using: .utf8)!)
    exit(1)
}
let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: input, options: [:])
try handler.perform([request])
guard let observation = request.results?.first else {
    FileHandle.standardError.write("no foreground instances found\n".data(using: .utf8)!)
    exit(2)
}
print("instances:", observation.allInstances.count)
let buffer = try observation.generateMaskedImage(ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: true)
let masked = CIImage(cvPixelBuffer: buffer)
let context = CIContext()
try context.writePNGRepresentation(of: masked, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, options: [:])
print("wrote", args[2], Int(masked.extent.width), "x", Int(masked.extent.height))
