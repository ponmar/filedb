using System;
using System.Collections.Generic;
using System.Text;

namespace FileDbApi
{
    public static class ExportedFileListParser
    {
        public static bool TryParse(string input, out List<int> result)
        {
            result = new List<int>();

            if (string.IsNullOrEmpty(input))
            {
                return false;
            }

            foreach (string fileIdStr in input.Split(";"))
            {
                if (fileIdStr == string.Empty)
                {
                    // Happens for last value returned by string.Split()
                    continue;
                }
                else if (int.TryParse(fileIdStr, out int fileId))
                {
                    result.Add(fileId);
                }
                else
                {
                    return false;
                }
            }

            return true;
        }
    }
}
